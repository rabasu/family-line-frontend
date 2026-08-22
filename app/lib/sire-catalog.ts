/**
 * 登録済み種牡馬カタログ（pedigree-sires + 在来で種牡馬実績のある牡馬）
 */
import fs from 'fs/promises'
import path from 'path'
import { stripTrailingCountryParen } from '@/lib/sire-manual-missing'

const SIRE_DIR = path.join(process.cwd(), 'app', 'pedigree-sires')
const TRAD_DIR = path.join(process.cwd(), 'app', 'pedigree-traditional')

export type SireCatalogEntry = {
  id: string
  name: string
  englishName?: string
  pedigreeName?: string
  foaledYear?: number | null
  netkeibaId?: string
  store: 'sire' | 'traditional'
  filename: string
  filepath: string
  /** 検索用正規化キー */
  searchKey: string
}

function repoRelative(filepath: string): string {
  return path.relative(process.cwd(), path.resolve(filepath)).replace(/\\/g, '/')
}

function normalizeSearchKey(name: string): string {
  return stripTrailingCountryParen(name || '')
    .toLowerCase()
    .replace(/[\s_\-・･']/g, '')
}

function scoreMatch(entry: SireCatalogEntry, q: string): number {
  const nq = normalizeSearchKey(q)
  if (!nq) return 0
  const keys = [
    normalizeSearchKey(entry.name),
    normalizeSearchKey(entry.englishName || ''),
    normalizeSearchKey(entry.id),
    normalizeSearchKey(entry.pedigreeName || ''),
  ].filter(Boolean)
  if (keys.some((k) => k === nq)) return 100
  if (entry.netkeibaId && entry.netkeibaId === q.trim()) return 95
  if (keys.some((k) => k.startsWith(nq))) return 80
  if (keys.some((k) => k.includes(nq))) return 60
  const name = (entry.name || '').toLowerCase()
  const en = (entry.englishName || '').toLowerCase()
  const pn = (entry.pedigreeName || '').toLowerCase()
  const ql = q.trim().toLowerCase()
  if (name.includes(ql) || en.includes(ql) || pn.includes(ql)) return 50
  return 0
}

async function loadPedigreeSires(): Promise<SireCatalogEntry[]> {
  let files: string[]
  try {
    files = (await fs.readdir(SIRE_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
  const out: SireCatalogEntry[] = []
  for (const filename of files) {
    const filepath = path.join(SIRE_DIR, filename)
    try {
      const data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
      const horse = data?.horse || {}
      const id = (horse.id || data?.metadata?.subjectHorseId || '').trim()
      if (!id) continue
      const name = (horse.name || data?.metadata?.subjectName || id).trim()
      const pedigreeName = String(horse.pedigreeName || '')
      out.push({
        id,
        name,
        englishName: horse.englishName || '',
        pedigreeName,
        foaledYear: horse.foaled?.year ?? null,
        netkeibaId: horse.netkeibaId || data?.metadata?.subjectNetkeibaId || '',
        store: 'sire',
        filename,
        filepath: repoRelative(filepath),
        searchKey: normalizeSearchKey(name || pedigreeName),
      })
    } catch {
      // skip
    }
  }
  return out
}

/**
 * 在来牝系内で、他馬の sireId として参照されている牡馬（種牡馬実績あり）
 */
async function loadTraditionalProvenSires(): Promise<SireCatalogEntry[]> {
  let files: string[]
  try {
    files = (await fs.readdir(TRAD_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }

  const referencedIds = new Set<string>()
  const byId = new Map<
    string,
    { horse: Record<string, unknown>; filename: string; filepath: string }
  >()

  for (const filename of files) {
    const filepath = path.join(TRAD_DIR, filename)
    let data: {
      horses?: Array<Record<string, unknown>>
    }
    try {
      data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    } catch {
      continue
    }
    for (const horse of data.horses || []) {
      const sid = String(horse.sireId || '').trim()
      if (sid) referencedIds.add(sid)
      const id = String(horse.id || '').trim()
      if (id && horse.sex === 'male') {
        // 同一 id が複数ファイルにあれば先勝ち（通常は1ファイル）
        if (!byId.has(id)) {
          byId.set(id, {
            horse,
            filename,
            filepath: repoRelative(filepath),
          })
        }
      }
    }
  }

  const out: SireCatalogEntry[] = []
  for (const id of referencedIds) {
    const hit = byId.get(id)
    if (!hit) continue
    const horse = hit.horse
    const name = String(horse.name || id)
    const englishName = String(horse.englishName || '')
    const pedigreeName = String(horse.pedigreeName || '')
    const foaled = horse.foaled as { year?: number } | undefined
    out.push({
      id,
      name,
      englishName,
      pedigreeName,
      foaledYear: foaled?.year ?? null,
      netkeibaId: String(horse.netkeibaId || ''),
      store: 'traditional',
      filename: hit.filename,
      filepath: hit.filepath,
      searchKey: normalizeSearchKey(name || pedigreeName),
    })
  }
  return out
}

let catalogCache: { at: number; entries: SireCatalogEntry[] } | null = null
const CACHE_MS = 30_000

export async function loadSireCatalog(
  force = false
): Promise<SireCatalogEntry[]> {
  const now = Date.now()
  if (!force && catalogCache && now - catalogCache.at < CACHE_MS) {
    return catalogCache.entries
  }
  const [sires, trad] = await Promise.all([
    loadPedigreeSires(),
    loadTraditionalProvenSires(),
  ])
  // id 重複時は pedigree-sires を優先
  const byId = new Map<string, SireCatalogEntry>()
  for (const e of trad) byId.set(e.id, e)
  for (const e of sires) byId.set(e.id, e)
  const entries = Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ja')
  )
  catalogCache = { at: now, entries }
  return entries
}

export async function searchSireCatalog(options: {
  q?: string
  hint?: string
  limit?: number
}): Promise<{
  items: SireCatalogEntry[]
  suggestions: SireCatalogEntry[]
  total: number
}> {
  const entries = await loadSireCatalog()
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 100)
  const q = (options.q || '').trim()
  const hint = (options.hint || '').trim()

  let items: SireCatalogEntry[] = []
  if (q) {
    items = entries
      .map((e) => ({ e, score: scoreMatch(e, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'ja'))
      .slice(0, limit)
      .map((x) => x.e)
  }

  let suggestions: SireCatalogEntry[] = []
  if (hint) {
    suggestions = entries
      .map((e) => ({ e, score: scoreMatch(e, hint) }))
      .filter((x) => x.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.e)
  }

  return { items, suggestions, total: entries.length }
}

export async function findCatalogEntryById(
  id: string
): Promise<SireCatalogEntry | null> {
  const target = (id || '').trim()
  if (!target) return null
  const entries = await loadSireCatalog()
  return entries.find((e) => e.id === target) || null
}

export async function findSireFileByNetkeibaId(
  netkeibaId: string
): Promise<{ filepath: string; data: Record<string, unknown> } | null> {
  const nk = (netkeibaId || '').trim()
  if (!nk || nk === 'none') return null
  let files: string[]
  try {
    files = (await fs.readdir(SIRE_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return null
  }
  for (const file of files) {
    const fp = path.join(SIRE_DIR, file)
    try {
      const data = JSON.parse(await fs.readFile(fp, 'utf-8'))
      const horseNk =
        data?.horse?.netkeibaId || data?.metadata?.subjectNetkeibaId || ''
      if (horseNk === nk) {
        return { filepath: fp, data }
      }
    } catch {
      // skip
    }
  }
  return null
}
