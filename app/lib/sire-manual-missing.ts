/**
 * 4代血統表手動入力向けのスキャン。
 *
 * - pedigree-sires で ancestryByPath の4代パス（s…dddd）が欠けている → 種牡馬不完全
 * - pedigree-sires で horse.breeder が空 → 種牡馬不完全（生産者/産地の人手入力）
 * - 牝祖以外 + sireNetkeibaId=none → 父馬未登録（pedigree-sires）
 * - 牝祖本人で4代未完了 → 牝祖4代（ancestryByPath を牝祖に直接書く。種牡馬単独保存しない）
 */
import fs from 'fs/promises'
import path from 'path'
import { allAncestryPaths } from '@/lib/sire-pedigree-paths'
import { stripTrailingCountryParen } from '@/lib/origin-country'

export { stripTrailingCountryParen }

export const SIRE_NETKEIBA_NONE = 'none'
export const UNKNOWN_PARENT_NAME = '不詳'
/** 父母 + 祖父母（s/d/ss/sd/ds/dd） */
export const TWO_GEN_PATHS = allAncestryPaths(2)
export const TWO_GEN_PATH_COUNT = TWO_GEN_PATHS.length
/** 4代血統表の全パス（保存時に不詳で埋まる枠） */
export const FOUR_GEN_PATHS = allAncestryPaths(4)
export const FOUR_GEN_PATH_COUNT = FOUR_GEN_PATHS.length
/** 種牡馬不完全キューに出す産駒の上限 */
export const SIRE_OFFSPRING_PREVIEW_LIMIT = 5

const TRAD_DIR = path.join(process.cwd(), 'app', 'pedigree-traditional')
const SIRE_DIR = path.join(process.cwd(), 'app', 'pedigree-sires')

export type RelatedChild = {
  id: string
  name: string
  filename: string
  filepath: string
  pedigreeName: string
  rootHorseId: string
  familyHref: string
  netkeibaId?: string
}

export type FamilyPageRef = {
  filename: string
  pedigreeName: string
  rootHorseId: string
  familyHref: string
}

export type MissingSireGroup = {
  sireName: string
  /** 代表子（API 互換用） */
  primaryChildId: string
  primaryChildName: string
  primaryFilepath: string
  relatedChildren: RelatedChild[]
  familyPages: FamilyPageRef[]
}

export type RootFourGenItem = {
  rootHorseId: string
  rootName: string
  filepath: string
  filename: string
  pedigreeName: string
  familyHref: string
  netkeibaId: string
  sireName: string
  damName: string
  ancestryPresent: number
  ancestryMissing: number
  skipScrapeReason: string
}

export type IncompleteSireReason =
  | 'incomplete_four_gen_pedigree'
  | 'missing_breeder'

export type IncompleteSireItem = {
  horseId: string
  name: string
  filepath: string
  filename: string
  netkeibaId: string
  sireName: string
  damName: string
  ancestryPresent: number
  ancestryMissing: number
  missingPaths: string[]
  missingBreeder: boolean
  reason: IncompleteSireReason
}

type TradHorse = {
  id?: string
  name?: string
  sire?: string
  dam?: string
  sireId?: string
  sireNetkeibaId?: string
  netkeibaId?: string
  ancestryByPath?: Record<string, unknown>
}

type TradFile = {
  metadata?: {
    pedigreeName?: string
    rootHorseId?: string
    incompleteFourGenResolved?: boolean
    [key: string]: unknown
  }
  horses?: TradHorse[]
}

function repoRelative(filepath: string): string {
  const abs = path.resolve(filepath)
  const root = path.resolve(process.cwd())
  return path.relative(root, abs).replace(/\\/g, '/')
}

function isUnknownParent(name: string): boolean {
  const t = (name || '').trim()
  return !t || t === UNKNOWN_PARENT_NAME || t === '不明' || t === '未登録'
}

function sireNamesMatch(a: string, b: string): boolean {
  const aa = (a || '').trim()
  const bb = (b || '').trim()
  if (!aa || !bb) return false
  if (aa === bb) return true
  const na = stripTrailingCountryParen(aa)
  const nb = stripTrailingCountryParen(bb)
  return Boolean(na && nb && (na === nb || na === bb || aa === nb))
}

/** traditional 全ファイルの rootHorseId 集合 */
export async function loadTraditionalRootIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  let files: string[]
  try {
    files = (await fs.readdir(TRAD_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return ids
  }
  for (const filename of files) {
    try {
      const data: TradFile = JSON.parse(
        await fs.readFile(path.join(TRAD_DIR, filename), 'utf-8')
      )
      const rootId = data.metadata?.rootHorseId || ''
      if (rootId) ids.add(rootId)
    } catch {
      // skip
    }
  }
  return ids
}

/**
 * 牝祖以外で、手動4代入力が必要な父馬名ごとにグルーピングする。
 * 条件: 非牝祖 && sireNetkeibaId=none && sireId空 && sire非空 && sire≠不詳
 * グループキーは末尾国名括弧を除いた馬名。
 */
export async function scanMissingSireGroups(): Promise<MissingSireGroup[]> {
  let files: string[]
  try {
    files = (await fs.readdir(TRAD_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }

  const bySire = new Map<string, MissingSireGroup>()

  for (const filename of files.sort()) {
    const filepath = path.join(TRAD_DIR, filename)
    let data: TradFile
    try {
      data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    } catch {
      continue
    }
    const pedigreeName = data.metadata?.pedigreeName || filename.replace(/\.json$/, '')
    const rootHorseId = data.metadata?.rootHorseId || ''
    const familyHref = rootHorseId ? `/family/${rootHorseId}` : ''
    const relPath = repoRelative(filepath)

    for (const horse of data.horses || []) {
      const childId = horse.id || ''
      if (!childId) continue
      // 牝祖の父は種牡馬単独登録しない（牝祖4代でカバー）
      if (rootHorseId && childId === rootHorseId) continue
      if (horse.sireId) continue
      if ((horse.sireNetkeibaId || '') !== SIRE_NETKEIBA_NONE) continue
      const rawSireName = (horse.sire || '').trim()
      if (!rawSireName || rawSireName === UNKNOWN_PARENT_NAME) continue
      const sireName = stripTrailingCountryParen(rawSireName) || rawSireName

      const child: RelatedChild = {
        id: childId,
        name: horse.name || childId,
        filename,
        filepath: relPath,
        pedigreeName,
        rootHorseId,
        familyHref,
        netkeibaId: horse.netkeibaId || '',
      }

      let group = bySire.get(sireName)
      if (!group) {
        group = {
          sireName,
          primaryChildId: childId,
          primaryChildName: child.name,
          primaryFilepath: relPath,
          relatedChildren: [],
          familyPages: [],
        }
        bySire.set(sireName, group)
      }
      group.relatedChildren.push(child)
      if (
        familyHref &&
        !group.familyPages.some((p) => p.rootHorseId === rootHorseId && p.filename === filename)
      ) {
        group.familyPages.push({
          filename,
          pedigreeName,
          rootHorseId,
          familyHref,
        })
      }
    }
  }

  return Array.from(bySire.values()).sort((a, b) =>
    a.sireName.localeCompare(b.sireName, 'ja')
  )
}

/**
 * 牝祖4代の手動入力が必要な牝祖を列挙する。
 * ancestryByPath の4代パス（s…dddd）が欠けていれば対象。
 * 4代枠がすべて存在する（保存済み）馬は不詳でも対象外。
 */
export async function scanRootFourGenNeeded(): Promise<RootFourGenItem[]> {
  let files: string[]
  try {
    files = (await fs.readdir(TRAD_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }

  const items: RootFourGenItem[] = []

  for (const filename of files.sort()) {
    const filepath = path.join(TRAD_DIR, filename)
    let data: TradFile
    try {
      data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    } catch {
      continue
    }
    if (data.metadata?.incompleteFourGenResolved) continue
    const rootHorseId = data.metadata?.rootHorseId || ''
    if (!rootHorseId) continue
    const root = (data.horses || []).find((h) => h.id === rootHorseId)
    if (!root) continue
    const missingPaths = missingFourGenPaths(root)
    if (missingPaths.length === 0) continue

    const sireNk = (root.sireNetkeibaId || '').trim()
    const nk = (root.netkeibaId || '').trim()
    let skipReason = 'four_gen_incomplete'
    if (sireNk === SIRE_NETKEIBA_NONE) {
      skipReason = 'no_father_netkeiba_id'
    } else if (!nk) {
      skipReason = 'no_netkeiba_id'
    }

    const pedigreeName = data.metadata?.pedigreeName || filename.replace(/\.json$/, '')
    items.push({
      rootHorseId,
      rootName: root.name || rootHorseId,
      filepath: repoRelative(filepath),
      filename,
      pedigreeName,
      familyHref: `/family/${rootHorseId}`,
      netkeibaId: nk,
      sireName: (root.sire || '').trim(),
      damName: (root.dam || '').trim(),
      ancestryPresent: FOUR_GEN_PATH_COUNT - missingPaths.length,
      ancestryMissing: missingPaths.length,
      skipScrapeReason: skipReason,
    })
  }

  return items.sort((a, b) => a.rootName.localeCompare(b.rootName, 'ja'))
}

type SireFileHorse = {
  id?: string
  name?: string
  sire?: string
  dam?: string
  breeder?: string | null
  netkeibaId?: string
  ancestryByPath?: Record<string, { name?: string } | undefined>
}

type SireFile = {
  metadata?: {
    incompleteFourGenResolved?: boolean
    subjectHorseId?: string
    subjectNetkeibaId?: string
    subjectName?: string
    [key: string]: unknown
  }
  horse?: SireFileHorse
}

type HorseWithAncestry = {
  sire?: string
  dam?: string
  ancestryByPath?: Record<string, unknown>
}

function ancestryNodeName(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  return String((node as { name?: unknown }).name || '').trim()
}

function ancestryNameAt(horse: HorseWithAncestry, p: string): string {
  const nodeName = ancestryNodeName(horse.ancestryByPath?.[p])
  if (!isUnknownParent(nodeName)) return nodeName
  if (p === 's') return (horse.sire || '').trim()
  if (p === 'd') return (horse.dam || '').trim()
  return nodeName
}

/** 2代前（父母・祖父母）で空欄/未登録/不詳/不明のパス */
export function twoGenUnknownPaths(horse: HorseWithAncestry): string[] {
  return TWO_GEN_PATHS.filter((p) => isUnknownParent(ancestryNameAt(horse, p)))
}

/** ancestryByPath に無い4代パス（s / ss / sd … dddd） */
export function missingFourGenPaths(horse: HorseWithAncestry): string[] {
  const abp = horse.ancestryByPath || {}
  return FOUR_GEN_PATHS.filter(
    (p) => !Object.prototype.hasOwnProperty.call(abp, p)
  )
}

/** 4代分の枠がすべて JSON にある（画面の「保存」で空欄→不詳まで埋まった状態） */
export function hasCompleteFourGenAncestry(horse: HorseWithAncestry): boolean {
  return missingFourGenPaths(horse).length === 0
}

export function isMissingBreeder(horse: { breeder?: string | null }): boolean {
  return !(horse.breeder || '').trim()
}

/**
 * pedigree-sires のうち、4代パスが欠けているか、生産者（産地）が空の種牡馬。
 * 4代枠がすべて存在する（保存済み）ファイルは、4代理由では対象外（不詳でも可）。
 * 生産者空は incompleteFourGenResolved でも残す。
 */
export async function scanIncompleteSires(): Promise<IncompleteSireItem[]> {
  let files: string[]
  try {
    files = (await fs.readdir(SIRE_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }

  const items: IncompleteSireItem[] = []

  for (const filename of files.sort()) {
    const filepath = path.join(SIRE_DIR, filename)
    let data: SireFile
    try {
      data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    } catch {
      continue
    }
    const horse = data.horse || {}
    const horseId = (horse.id || data.metadata?.subjectHorseId || '').trim()
    if (!horseId) continue
    const missingPaths = missingFourGenPaths(horse)
    const missingBreeder = isMissingBreeder(horse)
    const fourGenIncomplete =
      missingPaths.length > 0 && !data.metadata?.incompleteFourGenResolved
    if (!fourGenIncomplete && !missingBreeder) continue

    items.push({
      horseId,
      name: (horse.name || data.metadata?.subjectName || horseId).trim(),
      filepath: repoRelative(filepath),
      filename,
      netkeibaId: (horse.netkeibaId || data.metadata?.subjectNetkeibaId || '').trim(),
      sireName: (horse.sire || '').trim() || (horse.ancestryByPath?.s?.name || '').trim(),
      damName: (horse.dam || '').trim() || (horse.ancestryByPath?.d?.name || '').trim(),
      ancestryPresent: FOUR_GEN_PATH_COUNT - missingPaths.length,
      ancestryMissing: missingPaths.length,
      missingPaths,
      missingBreeder,
      reason: fourGenIncomplete
        ? 'incomplete_four_gen_pedigree'
        : 'missing_breeder',
    })
  }

  return items.sort((a, b) => {
    const ar = a.reason === 'missing_breeder' ? 0 : 1
    const br = b.reason === 'missing_breeder' ? 0 : 1
    if (ar !== br) return ar - br
    return a.name.localeCompare(b.name, 'ja')
  })
}

export type SireOffspringPreview = {
  /** 牝祖以外の産駒（preview 上限） */
  children: RelatedChild[]
  total: number
  /** 在来の産駒総数（牝祖含む） */
  allTotal: number
  /** 牝祖以外の産駒数 */
  nonRootTotal: number
}

function sireNameKey(name: string): string {
  return stripTrailingCountryParen(name || '').trim()
}

function isTraditionalRootChild(childId: string, rootHorseId: string): boolean {
  return Boolean(rootHorseId) && childId === rootHorseId
}

function sortOffspringPreview(children: RelatedChild[]): RelatedChild[] {
  return [...children].sort((a, b) => {
    const an = (a.netkeibaId || '').trim() ? 0 : 1
    const bn = (b.netkeibaId || '').trim() ? 0 : 1
    if (an !== bn) return an - bn
    return (a.name || '').localeCompare(b.name || '', 'ja')
  })
}

/**
 * 在来 traditional から、指定種牡馬の産駒を拾う（sireId → netkeibaId → 馬名）。
 * preview は牝祖以外のみ、最大 SIRE_OFFSPRING_PREVIEW_LIMIT 頭。
 * nonRootTotal=0 なら種牡馬ファイルはキュー対象外（牝祖の父は牝祖4代で保持）。
 */
export async function collectOffspringForSires(
  sires: Array<{ horseId: string; netkeibaId?: string; name?: string }>,
  limit = SIRE_OFFSPRING_PREVIEW_LIMIT
): Promise<Map<string, SireOffspringPreview>> {
  const out = new Map<string, SireOffspringPreview>()
  const byId = new Map<string, string>()
  const byNk = new Map<string, string>()
  const byName = new Map<string, string>()

  for (const sire of sires) {
    const id = (sire.horseId || '').trim()
    if (!id) continue
    out.set(id, { children: [], total: 0, allTotal: 0, nonRootTotal: 0 })
    byId.set(id, id)
    const nk = (sire.netkeibaId || '').trim()
    if (nk && nk !== SIRE_NETKEIBA_NONE) byNk.set(nk, id)
    const name = sireNameKey(sire.name || '')
    if (name && name !== UNKNOWN_PARENT_NAME) byName.set(name, id)
  }

  if (out.size === 0) return out

  let files: string[]
  try {
    files = (await fs.readdir(TRAD_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return out
  }

  const seen = new Map<string, Set<string>>()

  for (const filename of files) {
    const filepath = path.join(TRAD_DIR, filename)
    let data: TradFile
    try {
      data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    } catch {
      continue
    }
    const pedigreeName =
      data.metadata?.pedigreeName || filename.replace(/\.json$/, '')
    const rootHorseId = data.metadata?.rootHorseId || ''
    const familyHref = rootHorseId ? `/family/${rootHorseId}` : ''
    const relPath = repoRelative(filepath)

    for (const horse of data.horses || []) {
      const childId = (horse.id || '').trim()
      if (!childId) continue

      let sireKey = ''
      const childSireId = (horse.sireId || '').trim()
      if (childSireId) {
        if (byId.has(childSireId)) sireKey = childSireId
      } else {
        const childSireNk = (horse.sireNetkeibaId || '').trim()
        if (childSireNk && childSireNk !== SIRE_NETKEIBA_NONE) {
          sireKey = byNk.get(childSireNk) || ''
        }
        if (!sireKey) {
          const nameKey = sireNameKey(horse.sire || '')
          if (nameKey) sireKey = byName.get(nameKey) || ''
        }
      }
      if (!sireKey) continue

      const bucket = out.get(sireKey)
      if (!bucket) continue
      let ids = seen.get(sireKey)
      if (!ids) {
        ids = new Set()
        seen.set(sireKey, ids)
      }
      if (ids.has(childId)) continue
      ids.add(childId)
      const isRoot = isTraditionalRootChild(childId, rootHorseId)
      bucket.allTotal += 1
      if (!isRoot) bucket.nonRootTotal += 1
      bucket.children.push({
        id: childId,
        name: horse.name || childId,
        filename,
        filepath: relPath,
        pedigreeName,
        rootHorseId,
        familyHref,
        netkeibaId: horse.netkeibaId || '',
      })
    }
  }

  for (const [id, bucket] of out) {
    const nonRoot = bucket.children.filter(
      (c) => !isTraditionalRootChild(c.id, c.rootHorseId)
    )
    out.set(id, {
      children: sortOffspringPreview(nonRoot).slice(0, limit),
      total: bucket.nonRootTotal,
      allTotal: bucket.allTotal,
      nonRootTotal: bucket.nonRootTotal,
    })
  }
  return out
}

type ChildMatchOptions = {
  /** 明示的に紐づける産駒 id（保存時の関連一覧） */
  childIds?: string[]
  /** 追加で照合する父馬名（キュー上の旧表記など） */
  alsoMatchSireNames?: string[]
}

function childMatchesPendingSire(
  horse: TradHorse,
  rootHorseId: string,
  childIdSet: Set<string>,
  matchNames: string[]
): boolean {
  if (!horse.id) return false
  if (rootHorseId && horse.id === rootHorseId) return false
  if (horse.sireId) return false
  if ((horse.sireNetkeibaId || '') !== SIRE_NETKEIBA_NONE) return false
  if (childIdSet.has(horse.id)) return true
  return matchNames.some((n) => sireNamesMatch(horse.sire || '', n))
}

/**
 * sireNetkeibaId=none / sireId空 の「非牝祖」子へ、父の netkeibaId だけ書く。
 * pedigree-sires ファイルは作らない（collect_sire_pedigrees が後で4代取得する前提）。
 */
export async function setChildrenSireNetkeibaId(
  sireNetkeibaId: string,
  options?: ChildMatchOptions & {
    /** 馬名照合用（キューの父馬名など） */
    sireName?: string
  }
): Promise<{ linkedCount: number; files: string[] }> {
  const sireNk = (sireNetkeibaId || '').trim()
  if (!sireNk || sireNk === SIRE_NETKEIBA_NONE) {
    return { linkedCount: 0, files: [] }
  }
  const childIdSet = new Set(
    (options?.childIds || []).map((x) => (x || '').trim()).filter(Boolean)
  )
  const matchNames = [
    options?.sireName || '',
    ...(options?.alsoMatchSireNames || []),
  ]
    .map((x) => (x || '').trim())
    .filter(Boolean)
  if (!childIdSet.size && !matchNames.length) {
    return { linkedCount: 0, files: [] }
  }

  let files: string[]
  try {
    files = (await fs.readdir(TRAD_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return { linkedCount: 0, files: [] }
  }

  let linkedCount = 0
  const touched: string[] = []

  for (const filename of files) {
    const filepath = path.join(TRAD_DIR, filename)
    let data: TradFile
    try {
      data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    } catch {
      continue
    }

    const rootHorseId = data.metadata?.rootHorseId || ''
    let changed = false
    for (const horse of data.horses || []) {
      if (
        !childMatchesPendingSire(horse, rootHorseId, childIdSet, matchNames)
      ) {
        continue
      }
      horse.sireNetkeibaId = sireNk
      linkedCount += 1
      changed = true
    }

    if (changed) {
      await fs.writeFile(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      touched.push(filename)
    }
  }

  return { linkedCount, files: touched }
}

/**
 * sireNetkeibaId=none / sireId空 の「非牝祖」子へ sireId を書き戻す。
 *
 * 紐づけ条件（いずれか）:
 * - childIds に含まれる（キューの関連産駒。馬名変更しても確実）
 * - 子の sire が targetSire / alsoMatchSireNames と一致（末尾国名括弧は無視）
 */
export async function linkChildrenToRegisteredSire(
  sireName: string,
  sireId: string,
  options?: ChildMatchOptions & {
    sireNetkeibaId?: string
  }
): Promise<{ linkedCount: number; files: string[] }> {
  const targetSire = (sireName || '').trim()
  if (!sireId) {
    return { linkedCount: 0, files: [] }
  }
  const childIdSet = new Set(
    (options?.childIds || []).map((x) => (x || '').trim()).filter(Boolean)
  )
  const matchNames = [targetSire, ...(options?.alsoMatchSireNames || [])]
    .map((x) => (x || '').trim())
    .filter(Boolean)
  if (!childIdSet.size && !matchNames.length) {
    return { linkedCount: 0, files: [] }
  }

  let files: string[]
  try {
    files = (await fs.readdir(TRAD_DIR)).filter((f) => f.endsWith('.json'))
  } catch {
    return { linkedCount: 0, files: [] }
  }

  const sireNk = (options?.sireNetkeibaId || '').trim()
  const displaySire = stripTrailingCountryParen(targetSire) || targetSire
  let linkedCount = 0
  const touched: string[] = []

  for (const filename of files) {
    const filepath = path.join(TRAD_DIR, filename)
    let data: TradFile
    try {
      data = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    } catch {
      continue
    }

    const rootHorseId = data.metadata?.rootHorseId || ''
    let changed = false
    for (const horse of data.horses || []) {
      if (
        !childMatchesPendingSire(horse, rootHorseId, childIdSet, matchNames)
      ) {
        continue
      }

      horse.sireId = sireId
      if (displaySire) horse.sire = displaySire
      if (sireNk) {
        horse.sireNetkeibaId = sireNk
      }
      linkedCount += 1
      changed = true
    }

    if (changed) {
      await fs.writeFile(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      touched.push(filename)
    }
  }

  return { linkedCount, files: touched }
}
