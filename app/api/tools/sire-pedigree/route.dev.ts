import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import {
  PedigreePathNodeInput,
  buildAncestryByPath,
} from '@/lib/sire-pedigree-paths'
import {
  linkChildrenToRegisteredSire,
  setChildrenSireNetkeibaId,
  stripTrailingCountryParen,
} from '@/lib/sire-manual-missing'
import {
  findCatalogEntryById,
  findSireFileByNetkeibaId,
} from '@/lib/sire-catalog'
import {
  upsertHorseIntoDamFamily,
  applyFoaledFromInput,
  applyOptionalHorseFields,
  loadTraditionalHorseRecord,
  updateTraditionalHorseInPlace,
  type RaceResultJson,
  type TraditionalOffspringInput,
} from '@/lib/traditional-horse-lookup'
import { createTraditionalFamily } from '@/lib/traditional-family-write'
import { hasLatin, slugifyId, toFileStem } from '@/lib/horse-id'
import { resolveHorseId } from '@/lib/horse-id-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EditMode =
  | 'sire'
  | 'missing_sire'
  | 'root'
  | 'new_family'
  | 'new_horse'
  | 'edit_horse'

const SIRE_DIR = path.join(process.cwd(), 'app', 'pedigree-sires')
const TRAD_DIR = path.join(process.cwd(), 'app', 'pedigree-traditional')
const QUEUE_PATH = path.join(
  process.cwd(),
  'scraping',
  'output',
  'sire_manual_queue.json'
)

function resolveRepoPath(filepath: string): string | null {
  if (!filepath) return null
  const norm = filepath.replace(/\\/g, '/')
  const markers = ['app/pedigree-traditional/', 'app/pedigree-sires/', 'app/pedigree/']
  for (const marker of markers) {
    const idx = norm.indexOf(marker)
    if (idx >= 0) {
      return path.join(process.cwd(), norm.slice(idx))
    }
  }
  if (path.isAbsolute(filepath)) return filepath
  return path.join(process.cwd(), filepath)
}

async function findSireFileById(id: string): Promise<string | null> {
  const files = await fs.readdir(SIRE_DIR)
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const fp = path.join(SIRE_DIR, file)
    try {
      const data = JSON.parse(await fs.readFile(fp, 'utf-8'))
      if (data?.horse?.id === id) return fp
    } catch {
      // skip
    }
  }
  return null
}

function nameEqualsLoose(a: string, b: string): boolean {
  const aa = (a || '').trim()
  const bb = (b || '').trim()
  if (!aa || !bb) return false
  if (aa === bb) return true
  const na = stripTrailingCountryParen(aa)
  const nb = stripTrailingCountryParen(bb)
  return Boolean(na && nb && (na === nb || na === bb || aa === nb))
}

async function findSireFileByName(name: string): Promise<{
  filepath: string
  data: Record<string, unknown>
} | null> {
  const target = (name || '').trim()
  if (!target) return null
  const files = await fs.readdir(SIRE_DIR)
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const fp = path.join(SIRE_DIR, file)
    try {
      const data = JSON.parse(await fs.readFile(fp, 'utf-8'))
      const horse = data?.horse || {}
      if (
        nameEqualsLoose(horse.name || '', target) ||
        nameEqualsLoose(horse.englishName || '', target) ||
        nameEqualsLoose(horse.pedigreeName || '', target)
      ) {
        return { filepath: fp, data }
      }
    } catch {
      // skip
    }
  }
  return null
}

async function collectUsedSireIds(): Promise<Set<string>> {
  const used = new Set<string>()
  const files = await fs.readdir(SIRE_DIR)
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const data = JSON.parse(await fs.readFile(path.join(SIRE_DIR, file), 'utf-8'))
      if (data?.horse?.id) used.add(data.horse.id)
    } catch {
      // skip
    }
  }
  return used
}

async function allocateSireId(
  preferred: string,
  used: Set<string>
): Promise<string> {
  let base = slugifyId(preferred)
  if (!base) base = 'unknown-sire'
  if (!used.has(base)) return base
  let i = 2
  while (used.has(`${base}-${i}`)) i += 1
  return `${base}-${i}`
}

async function loadQueueItem(childId: string) {
  const queue = JSON.parse(await fs.readFile(QUEUE_PATH, 'utf-8'))
  const items = queue.items || []
  const item = items.find((x: { child_id?: string }) => x.child_id === childId)
  return { queue, items, item }
}

async function loadRootHorse(childId: string, filepathHint?: string) {
  const fp = filepathHint ? resolveRepoPath(filepathHint) : null
  if (fp) {
    try {
      const data = JSON.parse(await fs.readFile(fp, 'utf-8'))
      const horse = (data.horses || []).find(
        (h: { id?: string }) => h.id === childId
      )
      if (horse) return { filepath: fp, data, horse }
    } catch {
      // fall through to scan
    }
  }

  const files = await fs.readdir(TRAD_DIR)
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const candidate = path.join(TRAD_DIR, file)
    try {
      const data = JSON.parse(await fs.readFile(candidate, 'utf-8'))
      const horse = (data.horses || []).find(
        (h: { id?: string }) => h.id === childId
      )
      if (horse) return { filepath: candidate, data, horse }
    } catch {
      // skip
    }
  }
  return null
}

type RaceResultBody = {
  race?: string
  displayRace?: string
  year?: string
  month?: string
  day?: string
  grade?: string
  racecourse?: string
  distance?: string
  entry?: string
  favorite?: string
  result?: string
}

type SubjectBody = {
  name?: string
  englishName?: string
  pedigreeName?: string
  formerName?: string
  localName?: string
  formerPedigreeName?: string
  color?: string
  foaledYear?: string
  foaledMonth?: string
  foaledDay?: string
  netkeibaId?: string
  id?: string
  sex?: string
  source?: string
  comments?: string
  comment?: string
  breed?: string
  breeder?: string
  importedYear?: string
  importedBy?: string
  familyNumber?: string
  registration?: string
  owner?: string
  pedigreeQueryId?: string
  allBreedPedigreeId?: string
  raceStatsRuns?: string
  raceStatsWins?: string
  raceResults?: RaceResultBody[]
}

function parseOptInt(v?: string): number | undefined {
  const t = (v || '').trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

function raceResultsFromSubject(
  raw?: RaceResultBody[]
): RaceResultJson[] | undefined {
  if (!raw) return undefined
  return raw
    .map((r) => {
      const race = (r.race || '').trim()
      const displayRace = (r.displayRace || '').trim() || race
      const year = parseOptInt(r.year)
      const month = parseOptInt(r.month)
      const day = parseOptInt(r.day)
      const out: RaceResultJson = {
        race,
        displayRace,
        grade: (r.grade || '').trim(),
        racecourse: (r.racecourse || '').trim(),
        distance: (r.distance || '').trim(),
        entry: (r.entry || '').trim(),
        favorite: (r.favorite || '').trim(),
        result: (r.result || '').trim(),
      }
      if (year || month || day) {
        out.date = {}
        if (year) out.date.year = year
        if (month) out.date.month = month
        if (day) out.date.day = day
      }
      return out
    })
    .filter((r) => Boolean(r.race))
}

function offspringFromSubject(
  subject: SubjectBody | undefined,
  fallback: { id: string; name: string; sex?: string }
): TraditionalOffspringInput {
  return {
    id: (subject?.id || '').trim() || fallback.id,
    name: (subject?.name || '').trim() || undefined,
    englishName: subject?.englishName,
    pedigreeName: subject?.pedigreeName,
    formerName: subject?.formerName,
    localName: subject?.localName,
    formerPedigreeName: subject?.formerPedigreeName,
    sex: (subject?.sex || '').trim() || fallback.sex,
    foaledYear: parseOptInt(subject?.foaledYear),
    foaledMonth: parseOptInt(subject?.foaledMonth),
    foaledDay: parseOptInt(subject?.foaledDay),
    color: subject?.color,
    breed: subject?.breed,
    breeder: subject?.breeder,
    owner: subject?.owner,
    importedYear: subject?.importedYear,
    importedBy: subject?.importedBy,
    familyNumber: subject?.familyNumber,
    registration: subject?.registration,
    netkeibaId: subject?.netkeibaId,
    pedigreeQueryId: subject?.pedigreeQueryId,
    allBreedPedigreeId: subject?.allBreedPedigreeId,
    source: subject?.source,
    comment: subject?.comment ?? subject?.comments,
    raceStatsRuns: parseOptInt(subject?.raceStatsRuns) ?? null,
    raceStatsWins: parseOptInt(subject?.raceStatsWins) ?? null,
    raceResults: raceResultsFromSubject(subject?.raceResults),
  }
}

function applySubjectToHorse(
  horse: Record<string, unknown>,
  subject?: SubjectBody,
  opts?: { forceSex?: string }
) {
  if (opts?.forceSex) horse.sex = opts.forceSex
  else if (subject?.sex && subject.sex.trim()) horse.sex = subject.sex.trim()
  if (!subject) return
  if (subject.name != null && subject.name !== '') horse.name = subject.name
  const offspring = offspringFromSubject(subject, {
    id: String(horse.id || ''),
    name: String(horse.name || ''),
    sex: String(horse.sex || ''),
  })
  applyOptionalHorseFields(horse, offspring)
  horse.foaled = applyFoaledFromInput(horse.foaled, offspring)
  for (const key of [
    'formerName',
    'localName',
    'formerPedigreeName',
  ] as const) {
    const value = subject[key]
    if (value === undefined) continue
    const trimmed = value.trim()
    if (trimmed) horse[key] = trimmed
    else delete horse[key]
  }
  if (subject.source !== undefined) {
    const trimmed = subject.source.trim()
    if (trimmed) horse.source = trimmed
    else delete horse.source
  }
  if (subject.comment !== undefined || subject.comments !== undefined) {
    const trimmed = (subject.comment ?? subject.comments ?? '').trim()
    if (trimmed) horse.comment = trimmed
    else delete horse.comment
    delete horse.comments
  }
  if (opts?.forceSex) horse.sex = opts.forceSex
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const mode = (searchParams.get('mode') || 'sire') as EditMode
    const filepathHint = searchParams.get('filepath') || undefined
    const sireNameParam = searchParams.get('sireName') || ''

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    if (mode === 'sire') {
      const fp = await findSireFileById(id)
      if (!fp) {
        return NextResponse.json({ error: 'sire not found' }, { status: 404 })
      }
      const data = JSON.parse(await fs.readFile(fp, 'utf-8'))
      return NextResponse.json({
        mode,
        filepath: fp,
        filename: path.basename(fp),
        data,
      })
    }

    if (mode === 'root') {
      const loaded = await loadRootHorse(id, filepathHint)
      if (!loaded) {
        return NextResponse.json({ error: 'root horse not found' }, { status: 404 })
      }
      return NextResponse.json({
        mode,
        filepath: loaded.filepath,
        filename: path.basename(loaded.filepath),
        data: {
          metadata: loaded.data.metadata,
          horse: loaded.horse,
        },
      })
    }

    if (mode === 'edit_horse') {
      const loaded = await loadTraditionalHorseRecord(id)
      if (!loaded) {
        return NextResponse.json(
          { error: `在来に馬が見つかりません: ${id}` },
          { status: 404 }
        )
      }
      return NextResponse.json({
        mode,
        filepath: loaded.hit.filepath,
        filename: loaded.hit.filename,
        familyHref: loaded.hit.familyHref,
        pedigreeName: loaded.hit.pedigreeName,
        data: {
          metadata: loaded.metadata,
          horse: loaded.horse,
        },
      })
    }

    // missing_sire: 父馬の4代を登録（既存 sire があればそれを、なければ空テンプレ）
    const { item } = await loadQueueItem(id)
    const sireName = (sireNameParam || item?.sire_name || '').trim()
    if (!sireName) {
      return NextResponse.json(
        { error: 'sire_name missing on queue item' },
        { status: 400 }
      )
    }
    const existing = await findSireFileByName(sireName)
    if (existing) {
      return NextResponse.json({
        mode,
        filepath: existing.filepath,
        filename: path.basename(existing.filepath),
        childId: id,
        childName: item?.child_name || '',
        childFilepath: item?.filepath || '',
        isNew: false,
        data: existing.data,
      })
    }

    return NextResponse.json({
      mode,
      filepath: null,
      filename: null,
      childId: id,
      childName: item?.child_name || '',
      childFilepath: item?.filepath || '',
      isNew: true,
      data: {
        metadata: { kind: 'sireFourGen', depth: 4 },
        horse: {
          id: '',
          name: sireName,
          sex: 'male',
          sire: '',
          dam: '',
          ancestryByPath: {},
        },
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type SaveBody = {
  id: string
  mode?: EditMode
  ancestryInput?: Record<string, PedigreePathNodeInput>
  filepath?: string
  subject?: SubjectBody
  /** missing_sire: 関連産駒 id（馬名変更時も sireId を確実に書く） */
  relatedChildIds?: string[]
  /** missing_sire: キュー上の父馬名（国名括弧付き旧表記など） */
  queueSireName?: string
  /**
   * missing_sire: 登録済み種牡馬 id に紐づけるだけ（新規ファイルを作らない）
   * ancestryInput は不要
   */
  linkExistingSireId?: string
  /**
   * missing_sire: 産駒の sireNetkeibaId だけ埋める（種牡馬ファイルは作らない）。
   * collect_sire_pedigrees が後で4代取得する前提。ancestryInput は不要。
   */
  setSireNetkeibaIdOnly?: string
  /**
   * sire: 母の牝系 JSON へ本人を産駒として保存する。ancestryInput は不要。
   * 父は traditionalSireId（在来または pedigree-sires）か、sire 名 + sireNetkeibaId（collect 用）でもよい。
   */
  saveToTraditional?: boolean
  traditionalDamId?: string
  traditionalSireId?: string
  traditionalSireName?: string
  traditionalSireNetkeibaId?: string
  /** 在来へ保存したあと、元の pedigree-sires ファイルを削除する */
  deleteSireFile?: boolean
  markResolved?: boolean
  /** true: 空欄を「不詳」で埋めず、キューも完了扱いにしない */
  draft?: boolean
}

async function markQueueResolved(
  childId: string,
  mode: EditMode,
  ancestryCount: number
): Promise<boolean> {
  try {
    const queueRaw = await fs.readFile(QUEUE_PATH, 'utf-8')
    const queue = JSON.parse(queueRaw)
    const items = queue.items || []
    let updated = false
    const now = new Date().toISOString()

    for (const item of items) {
      if (item.child_id !== childId) continue

      if (
        mode === 'sire' &&
        (item.reason === 'incomplete_four_gen_pedigree' ||
          item.reason === 'missing_breeder')
      ) {
        item.resolved = true
        item.resolvedAt = now
        item.ancestry_present = ancestryCount
        item.ancestry_missing = 0
        item.ancestry_empty_nodes = 0
        updated = true
      }

      if (mode === 'missing_sire' && item.reason === 'no_father_netkeiba_id') {
        // 牝祖4代未完了なら残す（root モード側で処理）
        if (item.root_four_gen_needed) continue
        item.resolved = true
        item.resolvedAt = now
        item.father_four_gen_resolved = true
        item.ancestry_present = ancestryCount
        item.ancestry_missing = 0
        updated = true
      }

      if (mode === 'root') {
        if (item.reason === 'root_incomplete_four_gen_pedigree') {
          item.resolved = true
          item.resolvedAt = now
          item.ancestry_present = ancestryCount
          item.ancestry_missing = 0
          updated = true
        }
        if (item.root_four_gen_needed) {
          // 牝祖の父は種牡馬単独登録しない。牝祖4代完了で完結させる
          item.root_four_gen_needed = false
          item.root_four_gen_resolved = true
          item.rootFourGenResolvedAt = now
          item.ancestry_present = ancestryCount
          item.ancestry_missing = 0
          if (item.reason === 'no_father_netkeiba_id') {
            item.resolved = true
            item.resolvedAt = now
            item.father_covered_by_root_four_gen = true
          }
          updated = true
        }
      }
    }

    if (updated) {
      queue.count = items.length
      await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n', 'utf-8')
    }
    return updated
  } catch {
    return false
  }
}

function collectRelatedChildIds(
  body: SaveBody,
  primaryId: string,
  item: { related_children?: Array<{ id?: string }>; sire_name?: string } | null
): string[] {
  const relatedFromBody = (body.relatedChildIds || [])
    .map((x) => (x || '').trim())
    .filter(Boolean)
  const relatedFromItem = (item?.related_children || [])
    .map((c) => (c.id || '').trim())
    .filter(Boolean)
  return Array.from(
    new Set([primaryId, ...relatedFromBody, ...relatedFromItem].filter(Boolean))
  )
}

function requestedHorseId(subjectId: string | undefined, routeId: string): string {
  const s = (subjectId || '').trim()
  if (s && s !== 'new') return s
  const r = (routeId || '').trim()
  if (r && r !== 'new') return r
  return ''
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveBody
    const id = body?.id
    const mode: EditMode = body?.mode || 'sire'
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // 登録済み種牡馬への紐づけのみ（4代入力なし・新規ファイルなし）
    if (mode === 'missing_sire' && body.linkExistingSireId) {
      const entry = await findCatalogEntryById(body.linkExistingSireId)
      if (!entry) {
        return NextResponse.json(
          { error: `登録済み種牡馬が見つかりません: ${body.linkExistingSireId}` },
          { status: 404 }
        )
      }
      const { item } = await loadQueueItem(id)
      const childIds = collectRelatedChildIds(body, id, item)
      const linked = await linkChildrenToRegisteredSire(entry.name, entry.id, {
        sireNetkeibaId: entry.netkeibaId || '',
        childIds,
        alsoMatchSireNames: [
          body.queueSireName || '',
          item?.sire_name || '',
          entry.name,
          entry.englishName || '',
        ],
      })
      const queueUpdated = await markQueueResolved(id, mode, 0)
      return NextResponse.json({
        ok: true,
        mode,
        linkedOnly: true,
        sireId: entry.id,
        sireName: entry.name,
        store: entry.store,
        filepath: entry.filepath,
        filename: entry.filename,
        childLinked: linked.linkedCount > 0,
        linkedCount: linked.linkedCount,
        linkedFiles: linked.files,
        queueUpdated,
      })
    }

    // netkeiba 登録済み: 産駒の sireNetkeibaId だけ埋める（ファイル作成なし）
    if (mode === 'missing_sire' && body.setSireNetkeibaIdOnly) {
      const sireNk = body.setSireNetkeibaIdOnly.trim()
      if (!sireNk || sireNk === 'none') {
        return NextResponse.json(
          { error: '有効な netkeibaId を指定してください' },
          { status: 400 }
        )
      }
      if (!/^[0-9a-fA-F]{10}$/.test(sireNk)) {
        return NextResponse.json(
          {
            error:
              'netkeibaId は10桁の英数字（例: 000a0012fc）で指定してください',
          },
          { status: 400 }
        )
      }
      const { item } = await loadQueueItem(id)
      const childIds = collectRelatedChildIds(body, id, item)
      const linked = await setChildrenSireNetkeibaId(sireNk, {
        childIds,
        sireName: body.queueSireName || item?.sire_name || '',
        alsoMatchSireNames: [
          body.queueSireName || '',
          item?.sire_name || '',
          body.subject?.name || '',
        ],
      })
      if (linked.linkedCount === 0) {
        return NextResponse.json(
          {
            error:
              '更新対象の産駒が見つかりませんでした（既に sireId があるか、sireNetkeibaId=none 以外）',
          },
          { status: 404 }
        )
      }
      const queueUpdated = await markQueueResolved(id, mode, 0)
      return NextResponse.json({
        ok: true,
        mode,
        netkeibaIdOnly: true,
        sireNetkeibaId: sireNk,
        childLinked: true,
        linkedCount: linked.linkedCount,
        linkedFiles: linked.files,
        queueUpdated,
      })
    }

    if (mode === 'new_family') {
      const name = (body.subject?.name || '').trim()
      const pedigreeName = (body.subject?.pedigreeName || '').trim()
      const englishName = (body.subject?.englishName || '').trim()
      const horseId = await resolveHorseId({
        preferredId: requestedHorseId(body.subject?.id, id),
        englishName,
        name,
        pedigreeName,
      })
      if (!horseId) {
        return NextResponse.json(
          { error: 'id を手入力するか、英名か日本語名を入れてください' },
          { status: 400 }
        )
      }
      if (!body.ancestryInput) {
        return NextResponse.json(
          { error: '4代血統（ancestryInput）が必要です' },
          { status: 400 }
        )
      }
      const isDraft = Boolean(body.draft)
      const ancestryByPath = buildAncestryByPath(body.ancestryInput, 4, {
        fillUnknown: !isDraft,
      })
      const offspring = offspringFromSubject(body.subject, {
        id: horseId,
        name: name || pedigreeName || englishName || horseId,
        sex: 'female',
      })
      offspring.id = horseId
      offspring.sex = 'female'
      try {
        const saved = await createTraditionalFamily({
          horse: offspring,
          ancestryByPath,
          sireName: ancestryByPath.s?.name || '',
          damName: ancestryByPath.d?.name || '',
          draft: isDraft,
        })
        return NextResponse.json({
          ok: true,
          mode,
          draft: isDraft,
          created: true,
          filepath: saved.filepath,
          filename: saved.filename,
          horseId: saved.horseId,
          pedigreeName: saved.pedigreeName,
          ancestryCount: Object.keys(ancestryByPath).length,
          mdxCreated: saved.mdxCreated,
          familyHref: `/family/${saved.horseId}`,
          indexNotes: saved.indexNotes,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        const conflict = message.includes('id を変更してください')
        return NextResponse.json(
          { error: message },
          { status: conflict ? 409 : 400 }
        )
      }
    }

    if (mode === 'new_horse') {
      const damId = (body.traditionalDamId || '').trim()
      const sireId = (body.traditionalSireId || '').trim()
      const sireName = (body.traditionalSireName || '').trim()
      const sireNk = (body.traditionalSireNetkeibaId || '').trim()
      const name = (body.subject?.name || '').trim()
      const pedigreeName = (body.subject?.pedigreeName || '').trim()
      const englishName = (body.subject?.englishName || '').trim()
      const sex = (body.subject?.sex || '').trim()
      if (!sex || !['male', 'female', 'gelding'].includes(sex)) {
        return NextResponse.json(
          { error: '性別（牡 / 牝 / セン）を選んでください' },
          { status: 400 }
        )
      }
      if (!damId) {
        return NextResponse.json(
          { error: '母馬（在来）を選んでください' },
          { status: 400 }
        )
      }
      if (!sireId && !sireName) {
        return NextResponse.json(
          { error: '父馬を選ぶか父馬名を入力してください' },
          { status: 400 }
        )
      }
      if (sireNk && sireNk !== 'none' && !/^[0-9a-fA-F]{10}$/.test(sireNk)) {
        return NextResponse.json(
          {
            error:
              'sireNetkeibaId は10桁の英数字か none です',
          },
          { status: 400 }
        )
      }
      const horseId = await resolveHorseId({
        preferredId: requestedHorseId(body.subject?.id, id),
        englishName,
        name,
        pedigreeName,
      })
      if (!horseId) {
        return NextResponse.json(
          { error: 'id を手入力するか、英名か日本語名を入れてください' },
          { status: 400 }
        )
      }
      const offspring = offspringFromSubject(body.subject, {
        id: horseId,
        name: name || pedigreeName || englishName || horseId,
        sex,
      })
      offspring.id = horseId
      offspring.sex = sex
      try {
        const saved = await upsertHorseIntoDamFamily({
          damId,
          sire: {
            id: sireId || undefined,
            name: sireName,
            netkeibaId: sireNk || undefined,
          },
          createOnly: true,
          horse: offspring,
        })
        return NextResponse.json({
          ok: true,
          mode,
          created: saved.created,
          filepath: saved.filepath,
          filename: saved.filename,
          horseId: saved.horseId,
          damName: saved.damName,
          sireName: saved.sireName,
          sireId: saved.sireId || '',
          sireNetkeibaId: saved.sireNetkeibaId || '',
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        const conflict = message.includes('既に') && message.includes('id=')
        return NextResponse.json(
          { error: message },
          { status: conflict ? 409 : 400 }
        )
      }
    }

    if (mode === 'edit_horse') {
      const horseId = requestedHorseId(body.subject?.id, id)
      if (!horseId) {
        return NextResponse.json({ error: 'id が必要です' }, { status: 400 })
      }
      const name = (body.subject?.name || '').trim()
      const sex = (body.subject?.sex || '').trim()
      if (sex && !['male', 'female', 'gelding'].includes(sex)) {
        return NextResponse.json(
          { error: '性別は牡 / 牝 / センです' },
          { status: 400 }
        )
      }
      const offspring = offspringFromSubject(body.subject, {
        id: horseId,
        name: name || horseId,
        sex: sex || undefined,
      })
      offspring.id = horseId
      try {
        const saved = await updateTraditionalHorseInPlace({
          horseId,
          horse: offspring,
          replaceRaceResults: true,
        })
        return NextResponse.json({
          ok: true,
          mode,
          filepath: saved.filepath,
          filename: saved.filename,
          horseId: saved.horseId,
          pedigreeName: saved.pedigreeName,
          familyHref: saved.familyHref,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        const missing = message.includes('見つかりません')
        return NextResponse.json(
          { error: message },
          { status: missing ? 404 : 400 }
        )
      }
    }

    if (mode === 'sire' && body.saveToTraditional) {
      const damId = (body.traditionalDamId || '').trim()
      const sireId = (body.traditionalSireId || '').trim()
      const sireName = (body.traditionalSireName || '').trim()
      const sireNk = (body.traditionalSireNetkeibaId || '').trim()
      if (!damId) {
        return NextResponse.json(
          { error: 'traditionalDamId（在来の母馬）が必要です' },
          { status: 400 }
        )
      }
      if (!sireId && !sireName) {
        return NextResponse.json(
          { error: '父馬を選ぶか父馬名を入力してください' },
          { status: 400 }
        )
      }
      if (sireNk && sireNk !== 'none' && !/^[0-9a-fA-F]{10}$/.test(sireNk)) {
        return NextResponse.json(
          {
            error:
              'sireNetkeibaId は10桁の英数字か none です',
          },
          { status: 400 }
        )
      }
      const fp = await findSireFileById(id)
      if (!fp) {
        return NextResponse.json({ error: 'sire not found' }, { status: 404 })
      }
      const data = JSON.parse(await fs.readFile(fp, 'utf-8'))
      const horse = data.horse || {}
      applySubjectToHorse(horse, body.subject, { forceSex: 'male' })
      const fromSubject = offspringFromSubject(body.subject, {
        id: String(horse.id || id),
        name: String(horse.name || body.subject?.name || id),
        sex: 'male',
      })
      fromSubject.id = String(horse.id || id)
      fromSubject.name = String(horse.name || fromSubject.name)
      fromSubject.sex = 'male'
      if (fromSubject.foaledYear == null) {
        fromSubject.foaledYear = (
          horse.foaled as { year?: number } | undefined
        )?.year
      }
      const saved = await upsertHorseIntoDamFamily({
        damId,
        sire: {
          id: sireId || undefined,
          name: sireName,
          netkeibaId: sireNk || undefined,
        },
        horse: fromSubject,
      })
      horse.sire = saved.sireName
      horse.dam = saved.damName
      horse.damId = damId
      if (saved.sireId) horse.sireId = saved.sireId
      else delete horse.sireId
      if (saved.sireNetkeibaId) horse.sireNetkeibaId = saved.sireNetkeibaId
      else delete horse.sireNetkeibaId
      data.horse = horse
      data.metadata = {
        ...(data.metadata || {}),
        source: 'manual_correction',
        savedToTraditional: saved.filepath,
        incompleteFourGenResolved: true,
      }

      let sireFileDeleted = ''
      const sireDirAbs = path.resolve(SIRE_DIR)
      const fpAbs = path.resolve(fp)
      const canDeleteSire =
        Boolean(body.deleteSireFile) &&
        (fpAbs === sireDirAbs || fpAbs.startsWith(sireDirAbs + path.sep))
      if (canDeleteSire) {
        await fs.unlink(fpAbs)
        sireFileDeleted = path.basename(fpAbs)
      } else {
        await fs.writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      }
      const queueUpdated = await markQueueResolved(id, mode, 0)
      return NextResponse.json({
        ok: true,
        mode,
        savedToTraditional: true,
        filepath: saved.filepath,
        filename: saved.filename,
        created: saved.created,
        horseId: saved.horseId,
        damName: saved.damName,
        sireName: saved.sireName,
        sireId: saved.sireId || '',
        sireNetkeibaId: saved.sireNetkeibaId || '',
        sireFileDeleted,
        queueUpdated,
      })
    }

    if (!body.ancestryInput) {
      return NextResponse.json(
        { error: 'id and ancestryInput required' },
        { status: 400 }
      )
    }

    const isDraft = Boolean(body.draft)
    const fillUnknown = !isDraft
    const markResolved = isDraft ? false : body.markResolved !== false
    const ancestryByPath = buildAncestryByPath(body.ancestryInput, 4, {
      fillUnknown,
    })
    const ancestryCount = Object.keys(ancestryByPath).length
    const sourceLabel = isDraft ? 'manual_draft' : 'manual_correction'

    if (mode === 'sire') {
      const fp = await findSireFileById(id)
      if (!fp) {
        return NextResponse.json({ error: 'sire not found' }, { status: 404 })
      }
      const data = JSON.parse(await fs.readFile(fp, 'utf-8'))
      const horse = data.horse || {}
      horse.ancestryByPath = ancestryByPath
      if (ancestryByPath.s?.name) horse.sire = ancestryByPath.s.name
      if (ancestryByPath.d?.name) horse.dam = ancestryByPath.d.name
      applySubjectToHorse(horse, body.subject)
      data.horse = horse
      data.metadata = {
        ...(data.metadata || {}),
        kind: 'sireFourGen',
        subjectHorseId: horse.id,
        subjectNetkeibaId: horse.netkeibaId || '',
        subjectName: horse.name || '',
        depth: 4,
        source: sourceLabel,
        ...(markResolved ? { incompleteFourGenResolved: true } : {}),
      }
      await fs.writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      const queueUpdated = markResolved
        ? await markQueueResolved(id, mode, ancestryCount)
        : false
      return NextResponse.json({
        ok: true,
        mode,
        draft: isDraft,
        filepath: fp,
        filename: path.basename(fp),
        ancestryCount,
        queueUpdated,
      })
    }

    if (mode === 'root') {
      const loaded = await loadRootHorse(id, body.filepath)
      if (!loaded) {
        return NextResponse.json({ error: 'root horse not found' }, { status: 404 })
      }
      const horse = loaded.horse
      horse.ancestryByPath = ancestryByPath
      if (ancestryByPath.s?.name) horse.sire = ancestryByPath.s.name
      if (ancestryByPath.d?.name) horse.dam = ancestryByPath.d.name
      applySubjectToHorse(horse, body.subject)
      loaded.data.metadata = {
        ...(loaded.data.metadata || {}),
        rootAncestrySource: sourceLabel,
        ...(markResolved ? { incompleteFourGenResolved: true } : {}),
      }
      // horses 配列内の該当要素を更新
      const horses = loaded.data.horses || []
      const idx = horses.findIndex((h: { id?: string }) => h.id === id)
      if (idx >= 0) horses[idx] = horse
      loaded.data.horses = horses
      await fs.writeFile(
        loaded.filepath,
        JSON.stringify(loaded.data, null, 2) + '\n',
        'utf-8'
      )
      const queueUpdated = markResolved
        ? await markQueueResolved(id, mode, ancestryCount)
        : false
      return NextResponse.json({
        ok: true,
        mode,
        draft: isDraft,
        filepath: loaded.filepath,
        filename: path.basename(loaded.filepath),
        ancestryCount,
        queueUpdated,
      })
    }

    // missing_sire
    const { item } = await loadQueueItem(id)
    const sireName =
      (body.subject?.name || item?.sire_name || '').trim() || '不詳'
    const subjectNk = (body.subject?.netkeibaId || '').trim()

    // netkeibaId が既存 pedigree-sires にあればそちらへ寄せる（重複下書き防止）
    const existingByNk = subjectNk
      ? await findSireFileByNetkeibaId(subjectNk)
      : null
    const existing = existingByNk || (await findSireFileByName(sireName))
    let fp = existing?.filepath || null
    let data = existing?.data as {
      metadata?: Record<string, unknown>
      horse?: Record<string, unknown>
    } | null
    const reusedByNetkeibaId = Boolean(existingByNk)
    const previousAncestry = {
      ...((data?.horse?.ancestryByPath || {}) as Record<string, unknown>),
    }

    if (!data) {
      const horseIdBase = await resolveHorseId({
        preferredId: body.subject?.id,
        englishName: body.subject?.englishName,
        name: (body.subject?.name || '').trim() || (sireName !== '不詳' ? sireName : ''),
        pedigreeName: body.subject?.pedigreeName,
      })
      if (!horseIdBase) {
        return NextResponse.json(
          { error: 'id を手入力するか、英名か日本語名を入れてください' },
          { status: 400 }
        )
      }
      const used = await collectUsedSireIds()
      const horseId = await allocateSireId(horseIdBase, used)
      const stem = toFileStem(
        (body.subject?.englishName || '').trim() ||
          (hasLatin(sireName) ? sireName : horseId),
        horseId
      )
      fp = path.join(SIRE_DIR, `${stem}.json`)
      try {
        await fs.access(fp)
        fp = path.join(SIRE_DIR, `${stem}_${horseId}.json`)
      } catch {
        // ok, free
      }
      data = {
        metadata: {},
        horse: {
          id: horseId,
          name: sireName,
          sex: 'male',
        },
      }
    }

    const horse = data.horse || {}
    const prevAncCount = Object.keys(previousAncestry).length
    const nextAncCount = Object.keys(ancestryByPath).length
    // 既存ファイル再利用時、薄い一時保存で4代を潰さない
    if (reusedByNetkeibaId && prevAncCount > nextAncCount) {
      horse.ancestryByPath = previousAncestry
    } else {
      horse.ancestryByPath = ancestryByPath
      if (ancestryByPath.s?.name) horse.sire = ancestryByPath.s.name
      if (ancestryByPath.d?.name) horse.dam = ancestryByPath.d.name
    }
    applySubjectToHorse(horse, body.subject, { forceSex: 'male' })
    if (!horse.name) horse.name = sireName
    if (!horse.id) {
      return NextResponse.json({ error: 'horse id missing' }, { status: 500 })
    }

    data.horse = horse
    data.metadata = {
      ...(data.metadata || {}),
      kind: 'sireFourGen',
      subjectHorseId: horse.id,
      subjectNetkeibaId: horse.netkeibaId || '',
      subjectName: horse.name || '',
      depth: 4,
      source: sourceLabel,
      createdForChildId: id,
    }

    if (!fp) {
      return NextResponse.json({ error: 'filepath unresolved' }, { status: 500 })
    }
    await fs.mkdir(SIRE_DIR, { recursive: true })
    await fs.writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')

    // 関連産駒 id 優先 + 馬名（国名括弧無視）で sireId 書き戻し
    let linkedCount = 0
    let linkedFiles: string[] = []
    if (!isDraft) {
      const childIds = collectRelatedChildIds(body, id, item)
      const linked = await linkChildrenToRegisteredSire(
        String(horse.name || sireName),
        String(horse.id),
        {
          sireNetkeibaId: String(horse.netkeibaId || ''),
          childIds,
          alsoMatchSireNames: [
            sireName,
            body.queueSireName || '',
            item?.sire_name || '',
            String(horse.name || ''),
          ],
        }
      )
      linkedCount = linked.linkedCount
      linkedFiles = linked.files
    }

    const queueUpdated = markResolved
      ? await markQueueResolved(id, mode, ancestryCount)
      : false

    return NextResponse.json({
      ok: true,
      mode,
      draft: isDraft,
      filepath: fp,
      filename: path.basename(fp),
      sireId: horse.id,
      childLinked: linkedCount > 0,
      linkedCount,
      linkedFiles,
      ancestryCount,
      queueUpdated,
      reusedByNetkeibaId,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
