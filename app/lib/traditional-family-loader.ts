/**
 * 在来牝系データのサーバー側ローダー。
 *
 * 以前は data/pedigree/index.ts の require.context で 305 個の JSON を
 * すべて webpack モジュール化し、読み込んだ牝系ツリーを無制限にキャッシュしていた。
 * 静的エクスポートで 8,594 頭分のページを生成するとこれがメモリを食い潰すため、
 * fs による遅延読み込みと件数上限つきキャッシュに置き換えている。
 *
 * すべて同期 API なのは、MDX 内で使う <FamilyTree> や <ProfileTable> が
 * pliny の MDXLayoutRenderer 配下で同期レンダリングされるため。
 * 静的エクスポートではこれらはビルド時にしか動かないので I/O をブロックしても問題ない。
 */
import fs from 'fs'
import path from 'path'
import type { Horse } from '@/types/Horse'
import type { HorseLinkData } from '@/types/HorseLinkData'
import { convertJsonToHorse, type PedigreeJsonData } from './pedigree-loader'

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
export function findHorseLinkByName(horseName: string): HorseLinkData | null {
  if (!horseName) return null

  const map = getHorseLinkMap()
  const found = map.get(horseName)
  if (found) return found

  if (process.env.NODE_ENV === 'development') {
    const keys = Array.from(map.keys())
    const similar = keys.filter((key) => key.includes(horseName) || horseName.includes(key))
    if (similar.length > 0) {
      console.warn(`馬「${horseName}」が見つかりませんでした。類似するキー:`, similar.slice(0, 5))
    } else {
      console.warn(`馬「${horseName}」が見つかりませんでした。利用可能なキーの例:`, keys.slice(0, 10))
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
