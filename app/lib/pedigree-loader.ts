import { Horse } from '@/types/Horse'
import { Foaled } from '@/types/Foaled'
import { Breed } from '@/types/Breed'
import { AggregatedRaceStats } from '@/types/AggregatedRaceStats'
import RaceResult from '@/types/RaceResult'
import { ReceivedAward } from '@/types/ReceivedAward'
import { newDate } from './utils'

/**
 * 牝系JSONデータの型定義
 */
export interface PedigreeJsonData {
  metadata: {
    pedigreeName: string
    rootHorseId: string
    lastUpdated: string
    source: string
    isTraditionalFamily?: boolean
  }
  horses: HorseJsonData[]
}

/**
 * JSON形式の馬データ
 */
export interface HorseJsonData {
  id: string
  name: string
  pedigreeName?: string
  formerName?: string
  localName?: string
  formerPedigreeName?: string
  linkName?: string
  linkPedigreeName?: string
  englishName?: string
  foaled: { year: number; month?: number; day?: number }
  sex: string
  breed: string
  sire: string
  dam: string
  color: string
  breeder: string
  netkeibaId: string
  damId?: string // 母馬のID（親子関係の表現）
  hasArticle?: boolean
  summary?: string
  details?: string
  raceStats?: {
    total: { runs: number; wins: number }
    divisions: Array<{ type: 'central' | 'local'; stats: unknown }>
  }
  prizeMoney?: {
    total: string
    central?: string
    local?: string
  }
  awards?: Array<{
    year: number
    award: string
  }>
  raceResults?: Array<{
    date: string | { year: number; month: number; day: number }
    race: string
    displayRace: string
    grade: string
    racecourse?: string
    distance?: string
    entry?: string
    favorite?: string
    result: string
  }>
  citation?: string[]
  retired?: string
  died?: string
  foaledAt?: string
  owner?: string
  trainer?: string
  jockey?: string
  comments?: string // コメントアウトされていた情報
  source: string
  // 牝祖用
  importedYear?: string // 輸入年
  importedBy?: string // 輸入者
  familyNumber?: string // 系統番号
  registration?: string // 馬匹血統登録書における登録番号
}

/**
 * JSON形式の牝系データをHorse型に変換する
 */
export function convertJsonToHorse(pedigreeData: PedigreeJsonData): Horse {
  const { metadata, horses } = pedigreeData

  // データの基本検証
  if (!metadata || !metadata.rootHorseId) {
    throw new Error('metadata.rootHorseIdが存在しません')
  }
  if (!horses || !Array.isArray(horses) || horses.length === 0) {
    throw new Error('horsesデータが存在しないか空です')
  }

  // 牝祖を特定（完全一致または部分一致で検索）
  let rootHorse = horses.find((horse) => horse && horse.id === metadata.rootHorseId)
  if (!rootHorse) {
    // 部分一致で検索（例: "hoshitomo" で "hoshitomo-1923" を検索）
    rootHorse = horses.find((horse) => horse && horse.id && horse.id.includes(metadata.rootHorseId))
  }
  if (!rootHorse) {
    throw new Error(`牝祖が見つかりません: ${metadata.rootHorseId}`)
  }

  // 牝祖をHorse型に変換し、子孫を再帰的に構築
  return buildHorseTree(rootHorse, horses)
}

/**
 * 馬データをHorse型に変換し、子孫を再帰的に構築する
 */
function buildHorseTree(horseData: HorseJsonData, allHorses: HorseJsonData[]): Horse {
  // 基本データをHorse型に変換（安全な処理）
  const horse: Horse = {
    id: horseData.id || 'unknown',
    name: horseData.name || '不明',
    foaled: convertFoaledFromObject(horseData.foaled),
    sex: (horseData.sex as 'male' | 'female' | 'gelding') || 'male',
    breed: (horseData.breed as Breed) || 'サラブレッド種',
    sire: horseData.sire || '',
    dam: horseData.dam || '',
    color: horseData.color || '',
    breeder: horseData.breeder || '',
    netkeibaId: horseData.netkeibaId || '',
    children: [],
  }

  // オプショナルフィールドを追加（Horse型のすべての属性を含める）
  if (horseData.pedigreeName) horse.pedigreeName = horseData.pedigreeName
  if (horseData.formerName) horse.formerName = horseData.formerName
  if (horseData.localName) horse.localName = horseData.localName
  if (horseData.formerPedigreeName) horse.formerPedigreeName = horseData.formerPedigreeName
  if (horseData.linkName) horse.linkName = horseData.linkName
  if (horseData.linkPedigreeName) horse.linkPedigreeName = horseData.linkPedigreeName
  if (horseData.englishName) horse.englishName = horseData.englishName
  if (horseData.hasArticle !== undefined) horse.hasArticle = horseData.hasArticle
  if (horseData.summary) horse.summary = horseData.summary
  if (horseData.details) horse.details = horseData.details
  if (horseData.raceStats) horse.raceStats = horseData.raceStats as AggregatedRaceStats
  if (horseData.prizeMoney) horse.prizeMoney = horseData.prizeMoney
  if (horseData.awards) horse.awards = horseData.awards as ReceivedAward[]
  if (horseData.citation) horse.citation = horseData.citation
  if (horseData.retired) horse.retired = horseData.retired
  if (horseData.died) horse.died = horseData.died
  if (horseData.foaledAt) horse.foaledAt = horseData.foaledAt
  if (horseData.owner) horse.owner = horseData.owner
  if (horseData.trainer) horse.trainer = horseData.trainer
  if (horseData.jockey) horse.jockey = horseData.jockey
  if (horseData.source) horse.source = horseData.source
  if (horseData.comments) horse.comments = horseData.comments
  if (horseData.importedYear) horse.importedYear = horseData.importedYear
  if (horseData.importedBy) horse.importedBy = horseData.importedBy
  if (horseData.familyNumber) horse.familyNumber = horseData.familyNumber
  if (horseData.registration) horse.registration = horseData.registration
  if (horseData.raceResults) {
    // raceResultsのdateフィールドをDate型に変換
    horse.raceResults = horseData.raceResults.map((result) => ({
      ...result,
      date: typeof result.date === 'string' ? new Date(result.date) : new Date(result.date.year, result.date.month - 1, result.date.day),
    })) as RaceResult[]
  }

  // 子馬を検索して再帰的に構築
  const children = allHorses.filter((child) => child.damId === horseData.id)
  horse.children = children.map((child) => buildHorseTree(child, allHorses))

  return horse
}

/**
 * foaledオブジェクトをFoaled型に変換する
 */
function convertFoaledFromObject(foaledObj: { year: number; month?: number; day?: number }): Foaled {
  if (!foaledObj || typeof foaledObj.year !== 'number') {
    // foaledデータが不正な場合はデフォルト値を返す
    return new Foaled('不明')
  }

  if (foaledObj.month && foaledObj.day) {
    // 年月日
    return new Foaled(newDate(foaledObj.year, foaledObj.month, foaledObj.day))
  } else if (foaledObj.month) {
    // 年月
    return new Foaled(newDate(foaledObj.year, foaledObj.month, 1))
  } else {
    // 年のみ
    return new Foaled(foaledObj.year.toString())
  }
}

/**
 * 古い文字列形式のfoaledをFoaled型に変換する（後方互換性用）
 */
function convertFoaledFromString(foaledString: string, foaledArray: string[]): Foaled {
  if (foaledArray.length === 1) {
    // 年のみ
    return new Foaled(foaledArray[0])
  } else if (foaledArray.length === 2) {
    // 年月
    return new Foaled(newDate(parseInt(foaledArray[0]), parseInt(foaledArray[1]), 1))
  } else if (foaledArray.length === 3) {
    // 年月日
    return new Foaled(newDate(parseInt(foaledArray[0]), parseInt(foaledArray[1]), parseInt(foaledArray[2])))
  } else {
    // フォールバック
    return new Foaled(foaledString)
  }
}

/**
 * 牝系JSONファイルを読み込んでHorse型に変換する
 * 在来牝系のみを対象とする
 */
export async function loadPedigreeFromJson(filePath: string): Promise<Horse> {
  try {
    // 動的インポートでJSONファイルを読み込み
    const pedigreeData = (await import(filePath)) as PedigreeJsonData

    // 在来牝系チェック
    if (pedigreeData?.metadata?.isTraditionalFamily !== true) {
      throw new Error(`在来牝系ではないためスキップ: ${filePath}`)
    }

    return convertJsonToHorse(pedigreeData)
  } catch (error) {
    console.error(`牝系JSONファイルの読み込みに失敗: ${filePath}`, error)
    throw error
  }
}

/**
 * 複数の牝系JSONファイルを読み込んでPedigreeList形式に変換する
 */
export async function loadPedigreeListFromJson(pedigreeFiles: string[]): Promise<{ [key: string]: Horse }> {
  const pedigreeList: { [key: string]: Horse } = {}

  for (const filePath of pedigreeFiles) {
    try {
      const horse = await loadPedigreeFromJson(filePath)
      const key = filePath.split('/').pop()?.replace('.json', '') || ''
      pedigreeList[key] = horse
    } catch (error) {
      console.error(`牝系ファイルの読み込みに失敗: ${filePath}`, error)
      // エラーが発生しても他のファイルの処理を続行
    }
  }

  return pedigreeList
}
