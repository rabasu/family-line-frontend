import { Horse } from '@/types/Horse'
import { HorseData } from '@/types/HorseData'
import { HorseLinkData } from '@/types/HorseLinkData'
import pedigreeList from '.'
import horseLinkMapData from './horse-link-map.json'

const createHorseLinkMap = (horse: Horse, family: string, dam: Horse, horseLinkMap: Map<string, HorseData> = new Map()): Map<string, HorseData> => {
  const has_article: boolean = horse.details !== null
  const data: HorseData = {
    name: '',
    link: horse.id,
    family: family,
    horse: horse,
    dam: dam,
    article: has_article,
  }

  if (horse.name) {
    horseLinkMap.set(horse.linkName || horse.name, { ...data, name: horse.name })
  }

  if (horse.pedigreeName) {
    horseLinkMap.set(horse.linkPedigreeName || horse.pedigreeName, {
      ...data,
      name: horse.pedigreeName,
    })
  }

  if (horse.children) {
    horse.children.forEach((child) => {
      createHorseLinkMap(child, family, horse, horseLinkMap)
    })
  }
  return horseLinkMap
}

const mergeHorseLinkMapByPedigree = (pedigreeList: Map<string, Horse>): Map<string, HorseData> => {
  const mergedMap = new Map<string, HorseData>()

  pedigreeList.forEach((horse, family) => {
    const horseLinkMap = createHorseLinkMap(horse, family, horse, new Map())

    horseLinkMap.forEach((value, key) => {
      mergedMap.set(key, value)
    })
  })
  return mergedMap
}

let mergedHorseLinkMap: Map<string, HorseLinkData> | null = null
let isInitialized = false

/**
 * mergedHorseLinkMapを遅延初期化する
 * horse-link-map.jsonから軽量にロード（全ファイルを読み込まない）
 */
function ensureMergedHorseLinkMapInitialized(): Map<string, HorseLinkData> {
  if (!isInitialized) {
    mergedHorseLinkMap = new Map(Object.entries(horseLinkMapData).map(([name, data]) => [name, data as HorseLinkData]))
    isInitialized = true
  }
  return mergedHorseLinkMap!
}

/**
 * 「リンク生成用の馬名」で馬を検索する関数
 */
export function findHorseByName(horseName: string): HorseLinkData | null {
  if (!horseName) {
    return null
  }

  const map = ensureMergedHorseLinkMapInitialized()
  const horseData = map.get(horseName)

  if (horseData) {
    return horseData
  }

  if (process.env.NODE_ENV === 'development') {
    const availableKeys = Array.from(map.keys())
    const matchingKeys = availableKeys.filter((key) => key.includes(horseName) || horseName.includes(key))
    if (matchingKeys.length > 0) {
      console.warn(`馬「${horseName}」が見つかりませんでした。類似するキー:`, matchingKeys.slice(0, 5))
    } else {
      console.warn(`馬「${horseName}」が見つかりませんでした。利用可能なキーの例:`, availableKeys.slice(0, 10))
    }
  }

  return null
}

/**
 * 馬IDで馬を検索する関数
 */
export function findHorseById(horseId: string): HorseLinkData | null {
  if (!horseId) {
    return null
  }

  const map = ensureMergedHorseLinkMapInitialized()
  for (const [, value] of map) {
    if (value.link === horseId) {
      return value
    }
  }

  return null
}

/**
 * 馬IDで馬データ（軽量版）を検索する関数
 */
export function findHorseLinkDataById(horseId: string): HorseLinkData | null {
  return findHorseById(horseId)
}

const horseLinkMapAccessor = {
  get(): Map<string, HorseLinkData> {
    return ensureMergedHorseLinkMapInitialized()
  },
}

export default horseLinkMapAccessor
