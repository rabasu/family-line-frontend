import { Horse } from '@/types/Horse'
import { HorseData } from '@/types/HorseData'
import { HorseLinkData } from '@/types/HorseLinkData'
import { convertJsonToHorse } from '../lib/pedigree-loader'
import pedigreeList from '.'
import horseLinkMapData from './horse-link-map.json'

// pedigreeListを直接使用（循環参照を避けるため、index.tsからインポート）

const createHorseLinkMap = (horse: Horse, family: string, dam: Horse, horseLinkMap: Map<string, HorseData> = new Map()): Map<string, HorseData> => {
  // HorseLink生成用のMap
  // key: リンク生成用の馬名（一意）
  // value.name: リンク文字列として表示する馬名
  // value.link: リンク先の馬のid
  // value.family: リンク先の馬の牝系

  // key=name, および pedigree_name
  // id_name がある場合は name=key, link=id_name, なければ link=name
  const has_article: boolean = horse.details !== null
  const data: HorseData = {
    name: '',
    link: horse.id,
    family: family,
    horse: horse,
    dam: dam,
    article: has_article,
  }

  // 競走名リンク追加
  if (horse.name) {
    horseLinkMap.set(horse.linkName || horse.name, { ...data, name: horse.name })
  }

  // 血統名リンク追加
  if (horse.pedigreeName) {
    horseLinkMap.set(horse.linkPedigreeName || horse.pedigreeName, {
      ...data,
      name: horse.pedigreeName,
    })
  }

  // 再帰的にchildrenも追加
  if (horse.children) {
    horse.children.forEach((child) => {
      createHorseLinkMap(child, family, horse, horseLinkMap)
    })
  }
  return horseLinkMap
}

// pedigreeListをhorseMapに追加
const mergeHorseLinkMapByPedigree = (pedigreeList: Map<string, Horse>): Map<string, HorseData> => {
  const mergedMap = new Map<string, HorseData>()

  // pedigreeList をループして createHorseLinkMap を呼び出し、それぞれの結果をマージ
  pedigreeList.forEach((horse, family) => {
    const horseLinkMap = createHorseLinkMap(horse, family, horse, new Map())

    // 統合: 既存のキーがあれば上書きされる
    horseLinkMap.forEach((value, key) => {
      mergedMap.set(key, value)
    })
  })
  return mergedMap // 統合された Map を返す
}

// 遅延初期化用の変数（軽量版）
let mergedHorseLinkMap: Map<string, HorseLinkData> | null = null
let isInitialized = false

/**
 * mergedHorseLinkMapを遅延初期化する
 * horse-link-map.jsonから軽量にロード（全ファイルを読み込まない）
 */
function ensureMergedHorseLinkMapInitialized(): Map<string, HorseLinkData> {
  if (!isInitialized) {
    // 軽量マップから直接ロード
    mergedHorseLinkMap = new Map(Object.entries(horseLinkMapData).map(([name, data]) => [name, data as HorseLinkData]))
    isInitialized = true
  }
  return mergedHorseLinkMap!
}

/**
 * 「リンク生成用の馬名」で馬を検索する関数
 * 注意: 軽量マップを使用するため、完全なHorseオブジェクトは返さない
 * 完全なHorseオブジェクトが必要な場合は findHorseByIdOnDemand を使用
 * @param horseName リンク生成用の馬名（nameまたはlinkName、pedigreeNameまたはlinkPedigreeName）
 * @returns 見つかった馬のHorseLinkData、見つからない場合はnull
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

  // デバッグ: 見つからない場合、利用可能なキーを確認
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
 * 注意: 軽量マップを使用するため、完全なHorseオブジェクトは返さない
 * 完全なHorseオブジェクトが必要な場合は findHorseByIdOnDemand を使用
 * @param horseId 馬のID
 * @returns 見つかった馬のHorseLinkData、見つからない場合はnull
 */
export function findHorseById(horseId: string): HorseLinkData | null {
  if (!horseId) {
    return null
  }

  const map = ensureMergedHorseLinkMapInitialized()
  // mergedHorseLinkMapをループしてvalue.link === horseIdのエントリを探す
  for (const [, value] of map) {
    if (value.link === horseId) {
      return value
    }
  }

  return null
}

/**
 * 馬IDで馬データ（軽量版）を検索する関数
 * @param horseId 馬のID
 * @returns 見つかった馬のHorseLinkData、見つからない場合はnull
 */
export function findHorseLinkDataById(horseId: string): HorseLinkData | null {
  return findHorseById(horseId)
}

// デフォルトエクスポートを遅延初期化されたマップに変更
const horseLinkMapAccessor = {
  get(): Map<string, HorseLinkData> {
    return ensureMergedHorseLinkMapInitialized()
  },
}

export default horseLinkMapAccessor
