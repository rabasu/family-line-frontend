/**
 * 在来牝系（pedigree-traditional）の馬検索と、母の牝系への産駒追加。
 */
import fs from 'fs/promises'
import path from 'path'
import { stripTrailingCountryParen } from '@/lib/sire-manual-missing'
import { findCatalogEntryById, searchSireCatalog } from '@/lib/sire-catalog'

const TRAD_DIR = path.join(process.cwd(), 'app', 'pedigree-traditional')
// 開発時はエディタツールが JSON を書き換えるので短命にする。
// 本番ビルド中はデータが不変なうえ、再読み込みすると数千ページ分の生成で
// 305 ファイルの全走査を何度も繰り返すことになるため期限を設けない。
const CACHE_MS = process.env.NODE_ENV === 'production' ? Infinity : 30_000

export type TradHorseHit = {
  id: string
  name: string
  englishName?: string
  sex?: string
  foaledYear?: number | null
  netkeibaId?: string
  sire?: string
  dam?: string
  filename: string
  filepath: string
  rootHorseId: string
  /** 牝系（ファイル）の pedigreeName */
  pedigreeName: string
  /** 当該馬の血統名 */
  horsePedigreeName?: string
  familyHref: string
  /** 父馬検索で pedigree-sires にだけいるとき 'sire' */
  store?: 'traditional' | 'sire'
}

type TradFile = {
  metadata?: {
    pedigreeName?: string
    rootHorseId?: string
    lastUpdated?: string
    [key: string]: unknown
  }
  horses?: Array<Record<string, unknown>>
}

function repoRelative(filepath: string): string {
  return path.relative(process.cwd(), path.resolve(filepath)).replace(/\\/g, '/')
}

function normalizeSearchKey(name: string): string {
  return stripTrailingCountryParen(name || '')
    .toLowerCase()
    .replace(/[\s_\-・･']/g, '')
}

function scoreHit(hit: TradHorseHit, q: string): number {
  const raw = (q || '').trim()
  const nq = normalizeSearchKey(raw)
  if (!nq && !raw) return 0
  if (hit.id === raw) return 100
  if (hit.netkeibaId && hit.netkeibaId === raw) return 95
  const keys = [
    normalizeSearchKey(hit.name),
    normalizeSearchKey(hit.englishName || ''),
    normalizeSearchKey(hit.id),
    normalizeSearchKey(hit.horsePedigreeName || ''),
  ].filter(Boolean)
  if (keys.some((k) => k === nq)) return 90
  if (keys.some((k) => k.startsWith(nq))) return 70
  if (keys.some((k) => k.includes(nq))) return 50
  return 0
}

let cache: { at: number; horses: TradHorseHit[] } | null = null

export async function loadTraditionalHorses(
  force = false
): Promise<TradHorseHit[]> {
  const now = Date.now()
  if (!force && cache && now - cache.at < CACHE_MS) return cache.horses

  let files: string[]
  try {
    files = (await fs.readdir(TRAD_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }

  const horses: TradHorseHit[] = []
  for (const filename of files) {
    const filepath = path.join(TRAD_DIR, filename)
    let data: TradFile
    try {
      data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    } catch {
      continue
    }
    const rootHorseId = String(data.metadata?.rootHorseId || '')
    const pedigreeName =
      String(data.metadata?.pedigreeName || filename.replace(/\.json$/, ''))
    const rel = repoRelative(filepath)
    for (const horse of data.horses || []) {
      const id = String(horse.id || '').trim()
      if (!id) continue
      const foaled = horse.foaled as { year?: number } | undefined
      horses.push({
        id,
        name: String(horse.name || id),
        englishName: String(horse.englishName || ''),
        sex: String(horse.sex || ''),
        foaledYear: foaled?.year ?? null,
        netkeibaId: String(horse.netkeibaId || ''),
        sire: String(horse.sire || ''),
        dam: String(horse.dam || ''),
        filename,
        filepath: rel,
        rootHorseId,
        pedigreeName,
        horsePedigreeName: String(horse.pedigreeName || ''),
        familyHref: rootHorseId ? `/family/${rootHorseId}` : '',
      })
    }
  }

  cache = { at: now, horses }
  return horses
}

export async function searchTraditionalHorses(
  q: string,
  limit = 20
): Promise<TradHorseHit[]> {
  const query = (q || '').trim()
  if (!query) return []
  const horses = await loadTraditionalHorses()
  const cap = Math.min(Math.max(limit, 1), 40)
  return horses
    .map((h) => ({ h, score: scoreHit(h, query) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.h.name.localeCompare(b.h.name, 'ja')
    )
    .slice(0, cap)
    .map((x) => x.h)
}

/** 父馬候補: 在来 + pedigree-sires。同一 id は在来を優先 */
export async function searchFatherHorses(
  q: string,
  limit = 20
): Promise<TradHorseHit[]> {
  const query = (q || '').trim()
  if (!query) return []
  const cap = Math.min(Math.max(limit, 1), 40)
  const [trad, catalog] = await Promise.all([
    searchTraditionalHorses(query, cap),
    searchSireCatalog({ q: query, limit: cap }),
  ])
  const seen = new Set<string>()
  const merged: TradHorseHit[] = []
  for (const h of trad) {
    seen.add(h.id)
    merged.push({ ...h, store: 'traditional' })
  }
  for (const e of catalog.items) {
    if (e.store !== 'sire') continue
    if (seen.has(e.id)) continue
    seen.add(e.id)
    merged.push({
      id: e.id,
      name: e.name,
      englishName: e.englishName || '',
      foaledYear: e.foaledYear ?? null,
      netkeibaId: e.netkeibaId || '',
      filename: e.filename,
      filepath: e.filepath,
      rootHorseId: '',
      pedigreeName: e.pedigreeName || '',
      horsePedigreeName: e.pedigreeName || '',
      familyHref: '',
      store: 'sire',
    })
  }
  return merged
    .map((h) => ({ h, score: scoreHit(h, query) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.h.name.localeCompare(b.h.name, 'ja')
    )
    .slice(0, cap)
    .map((x) => x.h)
}

export async function findTraditionalHorseById(
  id: string
): Promise<TradHorseHit | null> {
  const target = (id || '').trim()
  if (!target) return null
  const horses = await loadTraditionalHorses()
  return horses.find((h) => h.id === target) || null
}

export async function loadTraditionalHorseRecord(id: string): Promise<{
  hit: TradHorseHit
  horse: Record<string, unknown>
  metadata?: TradFile['metadata']
} | null> {
  const hit = await findTraditionalHorseById(id)
  if (!hit) return null
  const abs = path.join(process.cwd(), hit.filepath)
  const data: TradFile = JSON.parse(await fs.readFile(abs, 'utf-8'))
  const horse = (data.horses || []).find((h) => String(h.id || '') === id)
  if (!horse) return null
  return { hit, horse, metadata: data.metadata }
}

export type RaceResultJson = {
  date?: { year?: number; month?: number; day?: number }
  race?: string
  displayRace?: string
  grade?: string
  racecourse?: string
  distance?: string
  entry?: string
  favorite?: string
  result?: string
}

export type TraditionalOffspringInput = {
  id: string
  name?: string
  englishName?: string
  pedigreeName?: string
  formerName?: string
  localName?: string
  formerPedigreeName?: string
  sex?: string
  foaledYear?: number
  foaledMonth?: number
  foaledDay?: number
  color?: string
  breed?: string
  breeder?: string
  owner?: string
  importedYear?: string
  importedBy?: string
  familyNumber?: string
  registration?: string
  netkeibaId?: string
  pedigreeQueryId?: string
  allBreedPedigreeId?: string
  source?: string
  comments?: string
  comment?: string
  raceStatsRuns?: number | null
  raceStatsWins?: number | null
  raceResults?: RaceResultJson[]
}

export type TraditionalSireRef = {
  /** 在来または pedigree-sires の id。無い場合は sireId を書かず collect に任せる */
  id?: string
  name: string
  netkeibaId?: string
}

/** JSON 上の raceStats のうち、上書き時に引き継ぐ部分だけを表した型 */
type RaceStatsShape = {
  total?: { runs?: number | null; wins?: number | null }
}

export function invalidateTraditionalHorseCache() {
  cache = null
}

function assignIfPresent(
  target: Record<string, unknown>,
  key: string,
  value: string | undefined
) {
  const t = (value || '').trim()
  if (t) target[key] = t
}

export function applyFoaledFromInput(
  prev: unknown,
  horse: Pick<
    TraditionalOffspringInput,
    'foaledYear' | 'foaledMonth' | 'foaledDay'
  >
): Record<string, number> {
  const base = {
    ...((prev && typeof prev === 'object' ? prev : {}) as Record<
      string,
      number
    >),
  }
  const next: Record<string, number> = {}
  const year = horse.foaledYear ?? base.year
  const month = horse.foaledMonth ?? base.month
  const day = horse.foaledDay ?? base.day
  if (year) next.year = year
  if (month) next.month = month
  if (day) next.day = day
  return next
}

export function applyOptionalHorseFields(
  target: Record<string, unknown>,
  horse: TraditionalOffspringInput
) {
  assignIfPresent(target, 'englishName', horse.englishName)
  assignIfPresent(target, 'pedigreeName', horse.pedigreeName)
  assignIfPresent(target, 'formerName', horse.formerName)
  assignIfPresent(target, 'localName', horse.localName)
  assignIfPresent(target, 'formerPedigreeName', horse.formerPedigreeName)
  assignIfPresent(target, 'color', horse.color)
  assignIfPresent(target, 'breed', horse.breed)
  assignIfPresent(target, 'breeder', horse.breeder)
  assignIfPresent(target, 'owner', horse.owner)
  assignIfPresent(target, 'importedYear', horse.importedYear)
  assignIfPresent(target, 'importedBy', horse.importedBy)
  assignIfPresent(target, 'familyNumber', horse.familyNumber)
  assignIfPresent(target, 'registration', horse.registration)
  assignIfPresent(target, 'netkeibaId', horse.netkeibaId)
  assignIfPresent(target, 'pedigreeQueryId', horse.pedigreeQueryId)
  assignIfPresent(target, 'allBreedPedigreeId', horse.allBreedPedigreeId)
  assignIfPresent(target, 'source', horse.source)
  if (horse.raceStatsRuns != null || horse.raceStatsWins != null) {
    const prevTotal = (target.raceStats as RaceStatsShape | undefined)?.total
    target.raceStats = {
      total: {
        runs: horse.raceStatsRuns ?? prevTotal?.runs ?? null,
        wins: horse.raceStatsWins ?? prevTotal?.wins ?? null,
      },
      divisions: Array.isArray(
        (target.raceStats as { divisions?: unknown })?.divisions
      )
        ? (target.raceStats as { divisions: unknown[] }).divisions
        : [],
    }
  }
  if (horse.raceResults && horse.raceResults.length > 0) {
    target.raceResults = horse.raceResults
  }
}

function assignOrDelete(
  target: Record<string, unknown>,
  key: string,
  value: string | undefined
) {
  if (value === undefined) return
  const t = value.trim()
  if (t) target[key] = t
  else delete target[key]
}

const EDITABLE_STRING_KEYS = [
  'englishName',
  'pedigreeName',
  'formerName',
  'localName',
  'formerPedigreeName',
  'color',
  'breed',
  'breeder',
  'owner',
  'importedYear',
  'importedBy',
  'familyNumber',
  'registration',
  'netkeibaId',
  'pedigreeQueryId',
  'allBreedPedigreeId',
  'source',
] as const

/**
 * 既存馬の属性を上書きする（空文字はキー削除）。
 * 母・父・id・ancestryByPath は触らない。
 */
export function applyEditableHorseFields(
  target: Record<string, unknown>,
  horse: TraditionalOffspringInput,
  options?: { replaceRaceResults?: boolean }
) {
  for (const key of EDITABLE_STRING_KEYS) {
    assignOrDelete(target, key, horse[key])
  }
  if (horse.raceStatsRuns != null || horse.raceStatsWins != null) {
    const prevTotal = (target.raceStats as RaceStatsShape | undefined)?.total
    target.raceStats = {
      total: {
        runs: horse.raceStatsRuns ?? prevTotal?.runs ?? null,
        wins: horse.raceStatsWins ?? prevTotal?.wins ?? null,
      },
      divisions: Array.isArray(
        (target.raceStats as { divisions?: unknown })?.divisions
      )
        ? (target.raceStats as { divisions: unknown[] }).divisions
        : [],
    }
  }
  if (options?.replaceRaceResults && horse.raceResults !== undefined) {
    target.raceResults = horse.raceResults
  } else if (horse.raceResults && horse.raceResults.length > 0) {
    target.raceResults = horse.raceResults
  }
}

/**
 * 在来牝系 JSON 内の既存馬を、同じファイル・同じ位置で更新する。
 * 母・父の付け替えはしない。
 */
export async function updateTraditionalHorseInPlace(options: {
  horseId: string
  horse: TraditionalOffspringInput
  nowIso: string
  replaceRaceResults?: boolean
}): Promise<{
  filepath: string
  filename: string
  horseId: string
  pedigreeName: string
  familyHref: string
}> {
  const horseId = (options.horseId || '').trim()
  if (!horseId) throw new Error('horse id required')
  const hit = await findTraditionalHorseById(horseId)
  if (!hit) {
    throw new Error(`在来に馬が見つかりません: ${horseId}`)
  }

  const abs = path.join(process.cwd(), hit.filepath)
  const data: TradFile = JSON.parse(await fs.readFile(abs, 'utf-8'))
  const horses = data.horses || []
  const idx = horses.findIndex((h) => String(h.id || '') === horseId)
  if (idx < 0) {
    throw new Error(`ファイル内に id=${horseId} がありません: ${hit.filename}`)
  }

  const prev = { ...horses[idx] }
  const next: Record<string, unknown> = { ...prev, id: horseId }
  const name = (options.horse.name || '').trim()
  if (name) next.name = name
  if (options.horse.sex && options.horse.sex.trim()) {
    next.sex = options.horse.sex.trim()
  }
  applyEditableHorseFields(next, options.horse, {
    replaceRaceResults: options.replaceRaceResults,
  })
  const commentText = options.horse.comment ?? options.horse.comments
  if (commentText !== undefined) {
    const t = commentText.trim()
    if (t) next.comment = t
    else delete next.comment
  }
  delete next.comments
  next.foaled = applyFoaledFromInput(prev.foaled, options.horse)

  horses[idx] = orderTraditionalHorseKeys(next)
  data.horses = horses
  data.metadata = {
    ...(data.metadata || {}),
    lastUpdated: options.nowIso,
  }
  await fs.writeFile(abs, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  cache = null

  return {
    filepath: hit.filepath,
    filename: hit.filename,
    horseId,
    pedigreeName: hit.pedigreeName,
    familyHref: hit.familyHref,
  }
}

/** scraping/get_pedigree_data.py `_convert_horse_data_to_json_base` + collect の追記順 */
const TRADITIONAL_HORSE_KEY_ORDER = [
  'id',
  'name',
  'foaled',
  'sex',
  'breed',
  'sire',
  'dam',
  'color',
  'breeder',
  'netkeibaId',
  'raceStats',
  'raceResults',
  'source',
  'englishName',
  'pedigreeName',
  'localName',
  'formerName',
  'formerPedigreeName',
  'linkName',
  'linkPedigreeName',
  'furigana',
  'prizeMoney',
  'owner',
  'trainer',
  'importedYear',
  'importedBy',
  'registration',
  'familyNumber',
  'ahonooraId',
  'jbisId',
  'bogusId',
  'newBogusId',
  'pedigreeQueryId',
  'allBreedPedigreeId',
  'comment',
  'ancestryByPath',
  'damId',
  'sireId',
  'sireNetkeibaId',
] as const

export function orderTraditionalHorseKeys(
  horse: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of TRADITIONAL_HORSE_KEY_ORDER) {
    if (key in horse && horse[key] !== undefined) out[key] = horse[key]
  }
  for (const key of Object.keys(horse)) {
    if (!(key in out) && horse[key] !== undefined) out[key] = horse[key]
  }
  return out
}

/**
 * 母馬の在来牝系 JSON へ産駒を追加（または同 id を更新）。
 * 父は在来 / pedigree-sires の id でも、馬名 + sireNetkeibaId だけでもよい（後者は collect 用）。
 * 別ファイルに同じ id がある場合はエラー。
 */
export async function upsertHorseIntoDamFamily(options: {
  damId: string
  sire: TraditionalSireRef
  horse: TraditionalOffspringInput
  nowIso: string
  /** true: 既存 id があればエラー（新規追加専用） */
  createOnly?: boolean
}): Promise<{
  filepath: string
  filename: string
  created: boolean
  horseId: string
  damName: string
  sireName: string
  sireId?: string
  sireNetkeibaId?: string
}> {
  const dam = await findTraditionalHorseById(options.damId)
  if (!dam) {
    throw new Error(`在来に母馬が見つかりません: ${options.damId}`)
  }
  const sireId = (options.sire.id || '').trim()
  let sireName = (options.sire.name || '').trim()
  let sireNk = (options.sire.netkeibaId || '').trim()
  if (sireId) {
    const tradSire = await findTraditionalHorseById(sireId)
    if (tradSire) {
      if (!sireName) sireName = tradSire.name
      if (!sireNk && tradSire.netkeibaId) sireNk = tradSire.netkeibaId
    } else {
      const catalogSire = await findCatalogEntryById(sireId)
      if (!catalogSire) {
        throw new Error(`父馬が見つかりません: ${sireId}`)
      }
      if (!sireName) sireName = catalogSire.name
      if (!sireNk && catalogSire.netkeibaId) sireNk = catalogSire.netkeibaId
    }
  }
  if (!sireName) {
    throw new Error('父馬名（sire）が必要です')
  }

  const horseId = (options.horse.id || '').trim()
  if (!horseId) throw new Error('horse id required')

  const existing = await findTraditionalHorseById(horseId)
  if (existing && options.createOnly) {
    throw new Error(
      `id=${horseId} は既に ${existing.filename} にあります。別の id を指定してください。`
    )
  }
  if (existing && existing.filepath !== dam.filepath) {
    throw new Error(
      `id=${horseId} は別の在来ファイルにあります: ${existing.filename}`
    )
  }

  const abs = path.join(process.cwd(), dam.filepath)
  const data: TradFile = JSON.parse(await fs.readFile(abs, 'utf-8'))
  const horses = data.horses || []
  const idx = horses.findIndex((h) => String(h.id || '') === horseId)
  const prev = idx >= 0 ? { ...horses[idx] } : {}

  const next: Record<string, unknown> = { ...prev, id: horseId }
  const name = (options.horse.name || '').trim()
  if (name) next.name = name
  else if (prev.name) next.name = prev.name
  else delete next.name
  next.sex = options.horse.sex || prev.sex || 'male'
  applyOptionalHorseFields(next, options.horse)
  if (!next.source) next.source = 'manual_correction'
  const commentText = options.horse.comment ?? options.horse.comments
  if (commentText !== undefined) {
    const t = commentText.trim()
    if (t) next.comment = t
    else delete next.comment
  }
  delete next.comments
  next.foaled = applyFoaledFromInput(prev.foaled, options.horse)
  next.sire = sireName
  next.dam = dam.name
  next.damId = dam.id
  delete next.damNetkeibaId
  if (sireId) {
    next.sireId = sireId
  } else {
    delete next.sireId
  }
  if (sireNk) next.sireNetkeibaId = sireNk
  else delete next.sireNetkeibaId

  if (idx < 0) {
    if (!next.raceStats) {
      next.raceStats = { total: { runs: 0, wins: 0 }, divisions: [] }
    }
    if (!next.raceResults) next.raceResults = []
    if (!next.foaled) next.foaled = {}
  }
  const ordered = orderTraditionalHorseKeys(next)
  if (idx >= 0) {
    horses[idx] = ordered
  } else {
    const damIdx = horses.findIndex((h) => String(h.id || '') === dam.id)
    if (damIdx >= 0) horses.splice(damIdx + 1, 0, ordered)
    else horses.push(ordered)
  }
  data.horses = horses
  data.metadata = {
    ...(data.metadata || {}),
    lastUpdated: options.nowIso,
  }
  await fs.writeFile(abs, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  cache = null

  return {
    filepath: dam.filepath,
    filename: dam.filename,
    created: idx < 0,
    horseId,
    damName: dam.name,
    sireName,
    sireId: sireId || undefined,
    sireNetkeibaId: sireNk || undefined,
  }
}
