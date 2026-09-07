/**
 * 在来牝系データのサーバー側ローダー。
 *
 * 以前は data/pedigree/index.ts の require.context で 305 個の JSON を
 * すべて webpack モジュール化し、読み込んだ牝系ツリーを無制限にキャッシュしていた。
 * 静的エクスポートで 8,594 頭分のページを生成するとこれがメモリを食い潰すため、
 * fs による遅延読み込みと件数上限つきキャッシュに置き換えている。
 *
 * すべて同期 API なのは、FamilyTree / ProfileTable がサーバーコンポーネントとして
 * ビルド時に描画されるため。静的エクスポートでは I/O をブロックしても問題ない。
 */
import fs from 'fs'
import path from 'path'
import type { Horse } from '@/types/Horse'
import type { HorseLinkData } from '@/types/HorseLinkData'
import { Foaled } from '@/types/Foaled'
import { convertHorseRecord, convertJsonToHorse, type PedigreeJsonData } from './pedigree-loader'
import { stripTrailingOriginCodeParen } from './origin-country'

const TRADITIONAL_DIR = path.join(process.cwd(), 'app', 'pedigree-traditional')
const PEDIGREE_METADATA = path.join(process.cwd(), 'data', 'pedigree', 'pedigree-metadata.json')
const HORSE_PAGE_INDEX = path.join(process.cwd(), 'data', 'pedigree', 'horse-page-index.json')
const HORSE_LINK_MAP = path.join(process.cwd(), 'data', 'pedigree', 'horse-link-map.json')

/**
 * 同時に展開しておく牝系ツリーの数。
 * /horse/[id] の generateStaticParams を牝系ごとにまとめて返すため、少数でもヒット率は高い。
 */
const FAMILY_CACHE_LIMIT = 4

export type HorsePageIndexEntry = {
  file: string
  family: string
  name: string
  year: number | null
  sex: string
  tier: 'index' | 'noindex'
}

export type HorsePageIndex = {
  generatedAt: string
  totalHorses: number
  indexableHorses: number
  horses: Record<string, HorsePageIndexEntry>
}

export type TraditionalFamily = {
  rootHorseId: string
  pedigreeName: string
  root: Horse
  /** 牝系ツリー内の全馬（id 引き） */
  byId: Map<string, Horse>
  /** 子 id → 母 id */
  damIdOf: Map<string, string>
}

function readJsonSync<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return fallback
  }
}

let familyFileMap: Record<string, string> | null = null

/** rootHorseId → ファイル名（pedigree-metadata.json） */
export function getFamilyFileMap(): Record<string, string> {
  if (!familyFileMap) {
    familyFileMap = readJsonSync<Record<string, string>>(PEDIGREE_METADATA, {})
  }
  return familyFileMap
}

const EMPTY_INDEX: HorsePageIndex = { generatedAt: '', totalHorses: 0, indexableHorses: 0, horses: {} }
let horsePageIndex: HorsePageIndex | null = null

export function getHorsePageIndex(): HorsePageIndex {
  if (!horsePageIndex) {
    horsePageIndex = readJsonSync<HorsePageIndex>(HORSE_PAGE_INDEX, EMPTY_INDEX)
  }
  return horsePageIndex
}

// 挿入順で最古を捨てる単純な LRU。Map は挿入順を保持する。
const familyCache = new Map<string, TraditionalFamily>()

function rememberFamily(key: string, family: TraditionalFamily) {
  // 参照するたびに最近使った扱いにする
  familyCache.delete(key)
  familyCache.set(key, family)
  while (familyCache.size > FAMILY_CACHE_LIMIT) {
    const oldest = familyCache.keys().next().value
    if (oldest === undefined) break
    familyCache.delete(oldest)
  }
}

function indexTree(root: Horse): { byId: Map<string, Horse>; damIdOf: Map<string, string> } {
  const byId = new Map<string, Horse>()
  const damIdOf = new Map<string, string>()

  const walk = (horse: Horse, damId?: string) => {
    byId.set(horse.id, horse)
    if (damId) damIdOf.set(horse.id, damId)
    for (const child of horse.children || []) {
      walk(child, horse.id)
    }
  }
  walk(root)

  return { byId, damIdOf }
}

function readFamilyFile(fileName: string): TraditionalFamily | null {
  let data: PedigreeJsonData
  try {
    data = JSON.parse(fs.readFileSync(path.join(TRADITIONAL_DIR, fileName), 'utf-8'))
  } catch (error) {
    console.error(`牝系JSONの読み込みに失敗: ${fileName}`, error)
    return null
  }

  if (data?.metadata?.isTraditionalFamily !== true) return null

  let root: Horse
  try {
    root = convertJsonToHorse(data)
  } catch (error) {
    console.error(`牝系ツリーの構築に失敗: ${fileName}`, error)
    return null
  }

  const { byId, damIdOf } = indexTree(root)

  return {
    rootHorseId: data.metadata.rootHorseId,
    pedigreeName: data.metadata.pedigreeName || fileName.replace(/\.json$/, ''),
    root,
    byId,
    damIdOf,
  }
}

/** rootHorseId から牝系ツリーを取得する */
export function loadFamilyByRootId(rootHorseId: string): TraditionalFamily | null {
  const cached = familyCache.get(rootHorseId)
  if (cached) {
    rememberFamily(rootHorseId, cached)
    return cached
  }

  const fileName = getFamilyFileMap()[rootHorseId]
  if (!fileName) return null

  const family = readFamilyFile(fileName)
  if (family) rememberFamily(rootHorseId, family)
  return family
}

/** 牝祖の Horse だけが欲しい場合 */
export function loadFamilyRoot(rootHorseId: string): Horse | null {
  return loadFamilyByRootId(rootHorseId)?.root ?? null
}

export type HorseLookup = {
  horse: Horse
  family: TraditionalFamily
  entry: HorsePageIndexEntry
}

/** 馬 id から、その馬と所属牝系を取得する */
export function findHorseById(horseId: string): HorseLookup | null {
  const entry = getHorsePageIndex().horses[horseId]
  if (!entry) return null

  const family = loadFamilyByRootId(entry.family)
  const horse = family?.byId.get(horseId)
  if (!family || !horse) return null

  return { horse, family, entry }
}

let horseLinkMap: Map<string, HorseLinkData> | null = null

/**
 * MDX 本文中の馬名からリンク先を引くためのマップ。
 * 1MB あるので import せず fs で読み、クライアントバンドルに載せない。
 */
function getHorseLinkMap(): Map<string, HorseLinkData> {
  if (!horseLinkMap) {
    const raw = readJsonSync<Record<string, HorseLinkData>>(HORSE_LINK_MAP, {})
    horseLinkMap = new Map(Object.entries(raw))
  }
  return horseLinkMap
}

/** 馬名（linkName / linkPedigreeName を含む）からリンク情報を引く */
export function findHorseLinkByName(
  horseName: string,
  options?: { quiet?: boolean; year?: number }
): HorseLinkData | null {
  if (!horseName) return null

  const map = getHorseLinkMap()
  const keys = [horseName]
  if (options?.year != null) keys.push(`${horseName}(${options.year})`)
  const stripped = stripTrailingOriginCodeParen(horseName)
  if (stripped && stripped !== horseName) {
    keys.push(stripped)
    if (options?.year != null) keys.push(`${stripped}(${options.year})`)
  }
  for (const key of keys) {
    const found = map.get(key)
    if (found) return found
  }

  if (process.env.NODE_ENV === 'development' && !options?.quiet) {
    const keysInMap = Array.from(map.keys())
    const similar = keysInMap.filter((key) => key.includes(horseName) || horseName.includes(key))
    if (similar.length > 0) {
      console.warn(`馬「${horseName}」が見つかりませんでした。類似するキー:`, similar.slice(0, 5))
    } else {
      console.warn(`馬「${horseName}」が見つかりませんでした。利用可能なキーの例:`, keysInMap.slice(0, 10))
    }
  }

  return null
}

/** 牝祖から対象馬までの母系（牝祖が先頭、対象馬が末尾） */
export function damLineOf(family: TraditionalFamily, horseId: string): Horse[] {
  const line: Horse[] = []
  const seen = new Set<string>()
  let current: string | undefined = horseId

  while (current && !seen.has(current)) {
    seen.add(current)
    const horse = family.byId.get(current)
    if (!horse) break
    line.unshift(horse)
    current = family.damIdOf.get(current)
  }

  return line
}

export type SireOffspring = {
  horse: Horse
  familyName: string
  familyRootId: string
}

/** sireId → 産駒 id（公開インデックスに載る馬だけ） */
let sireOffspringIndex: Map<string, string[]> | null = null

function getSireOffspringIndex(): Map<string, string[]> {
  if (sireOffspringIndex) return sireOffspringIndex

  const published = getHorsePageIndex().horses
  const map = new Map<string, string[]>()

  let files: string[]
  try {
    files = fs.readdirSync(TRADITIONAL_DIR).filter((file) => file.endsWith('.json') && !file.includes('.backup'))
  } catch (error) {
    console.error('種牡馬産駒インデックスの構築に失敗:', error)
    sireOffspringIndex = map
    return map
  }

  for (const fileName of files) {
    let data: PedigreeJsonData
    try {
      data = JSON.parse(fs.readFileSync(path.join(TRADITIONAL_DIR, fileName), 'utf-8'))
    } catch {
      continue
    }
    if (data?.metadata?.isTraditionalFamily !== true) continue

    for (const horse of data.horses || []) {
      const id = String(horse?.id || '').trim()
      const sireId = String(horse?.sireId || '').trim()
      if (!id || !sireId || !published[id]) continue
      const list = map.get(sireId)
      if (list) {
        if (!list.includes(id)) list.push(id)
      } else {
        map.set(sireId, [id])
      }
    }
  }

  sireOffspringIndex = map
  return map
}

/**
 * 指定 id を sireId に持つ産駒を、生年順で返す。
 * 牝系ツリーは展開しない（静的生成時にキャッシュを汚さないため）。
 */
export function findOffspringBySireId(sireId: string): SireOffspring[] {
  const ids = getSireOffspringIndex().get(sireId)
  if (!ids || ids.length === 0) return []

  const index = getHorsePageIndex()
  const byFile = new Map<string, string[]>()
  for (const id of ids) {
    const file = index.horses[id]?.file
    if (!file) continue
    const list = byFile.get(file)
    if (list) list.push(id)
    else byFile.set(file, [id])
  }

  const out: SireOffspring[] = []
  for (const [file, childIds] of byFile) {
    const wanted = new Set(childIds)
    let data: PedigreeJsonData
    try {
      data = JSON.parse(fs.readFileSync(path.join(TRADITIONAL_DIR, `${file}.json`), 'utf-8'))
    } catch (error) {
      console.error(`種牡馬産駒の読み込みに失敗: ${file}.json`, error)
      continue
    }
    const familyName = data.metadata?.pedigreeName || file
    const familyRootId = data.metadata?.rootHorseId || file
    for (const horseData of data.horses || []) {
      if (!wanted.has(horseData.id)) continue
      out.push({
        horse: convertHorseRecord(horseData),
        familyName,
        familyRootId,
      })
    }
  }

  out.sort((a, b) => {
    const byFoaled = Foaled.compare(a.horse.foaled, b.horse.foaled)
    if (byFoaled !== 0) return byFoaled
    const nameA = a.horse.name || a.horse.pedigreeName || a.horse.id
    const nameB = b.horse.name || b.horse.pedigreeName || b.horse.id
    return nameA.localeCompare(nameB, 'ja')
  })
  return out
}
