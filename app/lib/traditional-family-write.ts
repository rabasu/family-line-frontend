/**
 * 在来牝系 JSON の新規作成と、id/ファイル名の衝突チェック。
 */
import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { proposeTraditionalFilename } from '@/lib/horse-id'
import {
  applyFoaledFromInput,
  applyOptionalHorseFields,
  findTraditionalHorseById,
  invalidateTraditionalHorseCache,
  orderTraditionalHorseKeys,
  type TraditionalOffspringInput,
} from '@/lib/traditional-horse-lookup'

const TRAD_DIR = path.join(process.cwd(), 'app', 'pedigree-traditional')
const PEDIGREE_DIR = path.join(process.cwd(), 'app', 'pedigree')
const FAMILY_DIR = path.join(process.cwd(), 'data', 'family')
const METADATA_PATH = path.join(
  process.cwd(),
  'data',
  'pedigree',
  'pedigree-metadata.json'
)

export type IdConflict = {
  idTaken: boolean
  filenameTaken: boolean
  horseId: string
  filename: string
  existingIdFile?: string
  existingFilename?: string
}

export async function listJsonBasenames(dir: string): Promise<string[]> {
  try {
    return (await fs.readdir(dir)).filter(
      (f) => f.endsWith('.json') && !f.includes('.backup')
    )
  } catch {
    return []
  }
}

export async function checkTraditionalIdConflict(options: {
  id: string
  filename?: string
  englishName?: string
  name?: string
  pedigreeName?: string
}): Promise<IdConflict> {
  const horseId = (options.id || '').trim()
  const filename =
    (options.filename || '').trim() ||
    proposeTraditionalFilename({
      id: horseId,
      englishName: options.englishName,
      name: options.name,
      pedigreeName: options.pedigreeName,
    })
  const result: IdConflict = {
    idTaken: false,
    filenameTaken: false,
    horseId,
    filename,
  }
  if (!horseId) return result

  const existing = await findTraditionalHorseById(horseId)
  if (existing) {
    result.idTaken = true
    result.existingIdFile = existing.filename
  }

  const files = await listJsonBasenames(TRAD_DIR)
  const want = filename.toLowerCase()
  const hit = files.find((f) => f.toLowerCase() === want)
  if (hit) {
    result.filenameTaken = true
    result.existingFilename = hit
  }
  return result
}

function originPhrase(importedYear?: string): string {
  const raw = (importedYear || '').trim()
  const n = parseInt(raw, 10)
  if (!Number.isNaN(n) && String(n) === raw) return `${n}年に輸入された基礎牝馬`
  if (raw.includes('内国産')) return '内国産の基礎牝馬'
  return '基礎牝馬'
}

export async function writeFamilyMdx(options: {
  rootHorseId: string
  displayName: string
  importedYear?: string
}): Promise<{ created: boolean; path: string }> {
  const mdxPath = path.join(FAMILY_DIR, `${options.rootHorseId}.mdx`)
  try {
    await fs.access(mdxPath)
    return { created: false, path: mdxPath }
  } catch {
    // create
  }
  const display = options.displayName
  const content = `---
title: ${display}系
---

${originPhrase(options.importedYear)}「**${display}**」を牝祖とするファミリーライン。
`
  await fs.mkdir(FAMILY_DIR, { recursive: true })
  await fs.writeFile(mdxPath, content, 'utf-8')
  return { created: true, path: mdxPath }
}

async function patchPedigreeMetadata(rootHorseId: string, filename: string) {
  let meta: Record<string, string> = {}
  try {
    meta = JSON.parse(await fs.readFile(METADATA_PATH, 'utf-8'))
  } catch {
    meta = {}
  }
  meta[rootHorseId] = filename
  const sorted: Record<string, string> = {}
  for (const key of Object.keys(meta).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = meta[key]
  }
  await fs.writeFile(
    METADATA_PATH,
    JSON.stringify(sorted, null, 2) + '\n',
    'utf-8'
  )
}

export function runNodeScript(scriptRel: string): Promise<{
  code: number | null
  stdout: string
  stderr: string
}> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptRel], {
      cwd: process.cwd(),
      env: process.env,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (buf) => {
      stdout += buf.toString('utf8')
    })
    child.stderr.on('data', (buf) => {
      stderr += buf.toString('utf8')
    })
    child.on('close', (code) => resolve({ code, stdout, stderr }))
    child.on('error', (err) =>
      resolve({ code: 1, stdout: '', stderr: String(err) })
    )
  })
}

export async function regeneratePedigreeIndexes(): Promise<string[]> {
  const scripts = [
    'scripts/generate-pedigree-metadata.js',
    'scripts/generate-traditional-family-index.js',
    'scripts/generate-horse-link-map.js',
    'scripts/generate-horse-search-index.js',
  ]
  const notes: string[] = []
  for (const script of scripts) {
    const r = await runNodeScript(script)
    if (r.code !== 0) {
      notes.push(`${script} 失敗: ${(r.stderr || r.stdout).slice(0, 400)}`)
    }
  }
  return notes
}

export async function createTraditionalFamily(options: {
  horse: TraditionalOffspringInput
  ancestryByPath: Record<string, unknown>
  sireName: string
  damName: string
  draft?: boolean
}): Promise<{
  filepath: string
  filename: string
  horseId: string
  pedigreeName: string
  mdxCreated: boolean
  indexNotes: string[]
}> {
  const horseId = (options.horse.id || '').trim()
  if (!horseId) throw new Error('牝祖の id が必要です')
  const name = (options.horse.name || '').trim()
  const englishName = (options.horse.englishName || '').trim()
  const pedigreeName = (
    options.horse.pedigreeName ||
    name ||
    englishName ||
    horseId
  ).trim()

  const filename = proposeTraditionalFilename({
    id: horseId,
    englishName: options.horse.englishName,
    name,
    pedigreeName: options.horse.pedigreeName,
  })
  const conflict = await checkTraditionalIdConflict({
    id: horseId,
    filename,
    englishName: options.horse.englishName,
    name,
    pedigreeName: options.horse.pedigreeName,
  })
  if (conflict.idTaken || conflict.filenameTaken) {
    const bits: string[] = []
    if (conflict.idTaken) {
      bits.push(`id「${horseId}」は ${conflict.existingIdFile} で使用中`)
    }
    if (conflict.filenameTaken) {
      bits.push(`ファイル名「${conflict.existingFilename}」が既にあります`)
    }
    throw new Error(
      `${bits.join(' / ')}。id を変更してください（ファイル名重複による上書きを防ぐため自動リネームしません）。`
    )
  }

  const horse: Record<string, unknown> = {
    id: horseId,
    sex: 'female',
    sire: options.sireName || '不詳',
    dam: options.damName || '不詳',
    foaled: applyFoaledFromInput({}, options.horse),
    raceStats: {
      total: {
        runs: options.horse.raceStatsRuns ?? 0,
        wins: options.horse.raceStatsWins ?? 0,
      },
      divisions: [],
    },
    raceResults: options.horse.raceResults || [],
  }
  if (name) horse.name = name
  applyOptionalHorseFields(horse, options.horse)
  if (!horse.source) horse.source = 'manual_correction'
  const commentText = options.horse.comment ?? options.horse.comments
  if (commentText !== undefined) {
    const t = commentText.trim()
    if (t) horse.comment = t
  }
  if (Object.keys(options.ancestryByPath || {}).length) {
    horse.ancestryByPath = options.ancestryByPath
  }
  const ordered = orderTraditionalHorseKeys(horse)
  const data = {
    metadata: {
      pedigreeName,
      rootHorseId: horseId,
      source: options.draft ? 'manual_draft' : 'manual_correction',
      isTraditionalFamily: true,
      rootAncestrySource: options.draft ? 'manual_draft' : 'manual_correction',
    },
    horses: [ordered],
  }

  await fs.mkdir(TRAD_DIR, { recursive: true })
  const abs = path.join(TRAD_DIR, filename)
  await fs.writeFile(abs, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  invalidateTraditionalHorseCache()

  const mdx = await writeFamilyMdx({
    rootHorseId: horseId,
    displayName: name || pedigreeName,
    importedYear: options.horse.importedYear,
  })
  await patchPedigreeMetadata(horseId, filename)
  const indexNotes = await regeneratePedigreeIndexes()

  return {
    filepath: path.relative(process.cwd(), abs).replace(/\\/g, '/'),
    filename,
    horseId,
    pedigreeName,
    mdxCreated: mdx.created,
    indexNotes,
  }
}

export type PedigreeHorseSnap = {
  id: string
  name: string
  filename: string
  pedigreeName: string
  rootHorseId: string
  familyHref: string
  dir: 'traditional' | 'pedigree'
}

export async function snapshotPedigreeHorses(): Promise<{
  files: Map<string, number>
  horses: Map<string, PedigreeHorseSnap>
}> {
  const files = new Map<string, number>()
  const horses = new Map<string, PedigreeHorseSnap>()
  const dirs: Array<{ abs: string; dir: 'traditional' | 'pedigree' }> = [
    { abs: TRAD_DIR, dir: 'traditional' },
    { abs: PEDIGREE_DIR, dir: 'pedigree' },
  ]
  for (const { abs, dir } of dirs) {
    const names = await listJsonBasenames(abs)
    for (const filename of names) {
      const fp = path.join(abs, filename)
      try {
        const st = await fs.stat(fp)
        files.set(`${dir}:${filename}`, st.mtimeMs)
        const data = JSON.parse(await fs.readFile(fp, 'utf-8')) as {
          metadata?: { pedigreeName?: string; rootHorseId?: string }
          horses?: Array<{ id?: string; name?: string }>
        }
        const rootHorseId = String(data.metadata?.rootHorseId || '')
        const pedigreeName = String(
          data.metadata?.pedigreeName || filename.replace(/\.json$/, '')
        )
        for (const h of data.horses || []) {
          const id = String(h.id || '').trim()
          if (!id) continue
          horses.set(id, {
            id,
            name: String(h.name || id),
            filename,
            pedigreeName,
            rootHorseId,
            familyHref: rootHorseId ? `/family/${rootHorseId}` : '',
            dir,
          })
        }
      } catch {
        // skip
      }
    }
  }
  return { files, horses }
}

export function diffPedigreeSnapshots(
  before: Awaited<ReturnType<typeof snapshotPedigreeHorses>>,
  after: Awaited<ReturnType<typeof snapshotPedigreeHorses>>
): {
  addedHorses: PedigreeHorseSnap[]
  createdFamilies: Array<{
    filename: string
    pedigreeName: string
    rootHorseId: string
    familyHref: string
    dir: string
  }>
  updatedFamilies: Array<{
    filename: string
    pedigreeName: string
    rootHorseId: string
    familyHref: string
    dir: string
  }>
} {
  const addedHorses: PedigreeHorseSnap[] = []
  for (const [id, snap] of after.horses) {
    if (!before.horses.has(id)) addedHorses.push(snap)
  }

  const familyByFile = new Map<
    string,
    {
      filename: string
      pedigreeName: string
      rootHorseId: string
      familyHref: string
      dir: string
    }
  >()
  for (const snap of after.horses.values()) {
    const key = `${snap.dir}:${snap.filename}`
    if (!familyByFile.has(key)) {
      familyByFile.set(key, {
        filename: snap.filename,
        pedigreeName: snap.pedigreeName,
        rootHorseId: snap.rootHorseId,
        familyHref: snap.familyHref,
        dir: snap.dir,
      })
    }
  }

  const createdFamilies: Array<{
    filename: string
    pedigreeName: string
    rootHorseId: string
    familyHref: string
    dir: string
  }> = []
  const updatedFamilies: Array<{
    filename: string
    pedigreeName: string
    rootHorseId: string
    familyHref: string
    dir: string
  }> = []
  for (const [key, mtime] of after.files) {
    const fam = familyByFile.get(key)
    if (!fam) continue
    if (!before.files.has(key)) createdFamilies.push(fam)
    else if ((before.files.get(key) || 0) < mtime) updatedFamilies.push(fam)
  }

  return { addedHorses, createdFamilies, updatedFamilies }
}
