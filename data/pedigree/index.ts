import { Horse } from '@/types/Horse'
import { loadPedigreeFromJson, convertJsonToHorse, PedigreeJsonData } from '../../app/lib/pedigree-loader'
import pedigreeMetadata from './pedigree-metadata.json'

// 動的JSONファイル読み込み用の型定義
type JsonFileData = {
  fileName: string
  variableName: string
  keyName: string
  data: PedigreeJsonData | null
  horse: Horse | null
}

/**
 * ファイル名から変数名を生成する関数
 * 例: "ScarletInk.json" -> "SCARLET_INK"
 */
function generateVariableName(fileName: string): string {
  return fileName
    .replace('.json', '')
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')
}

/**
 * ファイル名からキー名を生成する関数
 * 例: "ScarletInk.json" -> "scarlet_ink"
 */
function generateKeyName(fileName: string): string {
  return fileName
    .replace('.json', '')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

// require.contextを一度だけ初期化（効率化）
// app/pedigree 内の.jsonファイルを検出（牝系データのみ）
// .backup.jsonファイルは除外
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonContext = (require as any).context('../../app/pedigree', false, /^\.\/(?!.*\.backup)[^/]+\.json$/)

/**
 * 在来牝系のJSONファイルを取得
 * pedigree-metadata.jsonから取得（既に在来牝系のみが含まれている）
 */
function getAvailableJsonFiles(): string[] {
  const mapping = ensureRootHorseIdMapInitialized()
  return Array.from(mapping.values())
}

/**
 * 指定されたJSONファイルを動的に読み込む
 * 在来牝系のみを対象とする
 */
async function loadJsonFile(fileName: string): Promise<JsonFileData> {
  const variableName = generateVariableName(fileName)

  try {
    const pedigreeData = (await import(`../../app/pedigree/${fileName}`)) as PedigreeJsonData

    if (pedigreeData?.metadata?.isTraditionalFamily !== true) {
      console.warn(`${fileName}は在来牝系ではないためスキップします`)
      return {
        fileName,
        variableName,
        keyName: '',
        data: null,
        horse: null,
      }
    }

    const rootHorseId = pedigreeData?.metadata?.rootHorseId

    if (!rootHorseId) {
      throw new Error(`metadata.rootHorseIdが存在しません: ${fileName}`)
    }

    const horse = await loadPedigreeFromJson(`../../app/pedigree/${fileName}`)

    return {
      fileName,
      variableName,
      keyName: rootHorseId,
      data: pedigreeData,
      horse,
    }
  } catch (error) {
    console.error(`JSONファイルの読み込みに失敗: ${fileName}`, error)
    return {
      fileName,
      variableName,
      keyName: generateKeyName(fileName),
      data: null,
      horse: null,
    }
  }
}

/**
 * すべてのJSONファイルを読み込んでJsonFileDataの配列を作成する
 */
async function loadAllJsonFiles(): Promise<JsonFileData[]> {
  const jsonFiles = getAvailableJsonFiles()
  const results: JsonFileData[] = []

  for (const fileName of jsonFiles) {
    try {
      const jsonFileData = await loadJsonFile(fileName)
      results.push(jsonFileData)
    } catch (error) {
      console.error(`JSONファイルの読み込みに失敗: ${fileName}`, error)
    }
  }

  return results
}

let jsonFilesData: JsonFileData[] = []
const jsonHorseCache = new Map<string, Horse | null>()

/**
 * 牝系データを取得する（TSXファイルとJSONファイルの両方に対応）
 */
async function getPedigreeData(key: string): Promise<Horse | null> {
  try {
    if (jsonHorseCache.has(key)) {
      return jsonHorseCache.get(key)!
    }

    if (jsonFilesData.length === 0) {
      jsonFilesData = await loadAllJsonFiles()
    }

    const jsonFileData = jsonFilesData.find((data) => data.keyName === key)
    if (jsonFileData && jsonFileData.horse) {
      jsonHorseCache.set(key, jsonFileData.horse)
      return jsonFileData.horse
    }

    const fileName = jsonFilesData.find((data) => data.keyName === key)?.fileName
    if (fileName) {
      const horse = await loadPedigreeFromJson(`../../app/pedigree/${fileName}`)
      jsonHorseCache.set(key, horse)
      return horse
    }

    return null
  } catch (error) {
    console.error(`JSON牝系データの読み込みに失敗: ${key}`, error)
    return null
  }
}

/**
 * require.contextを使用してJSONファイルを安全に読み込む
 * 在来牝系のみを対象とする
 */
function loadPedigreeFromJsonFile(fileName: string): Horse | null {
  try {
    if (fileName.includes('.backup') || fileName.includes('.tmp') || !fileName.endsWith('.json')) {
      console.warn(`${fileName}をスキップします (unsupported file)`)
      return null
    }

    const key = `./${fileName}`
    if (!jsonContext.keys().includes(key)) {
      console.warn(`${fileName}が見つかりません`)
      return null
    }

    const pedigreeData = jsonContext(key)

    if (!pedigreeData || !pedigreeData.metadata || !pedigreeData.horses || !Array.isArray(pedigreeData.horses)) {
      console.warn(`${fileName}: 不正なデータ構造`)
      return null
    }

    if (pedigreeData.metadata.isTraditionalFamily !== true) {
      console.warn(`${fileName}は在来牝系ではないためスキップします`)
      return null
    }

    return convertJsonToHorse(pedigreeData)
  } catch (error) {
    console.warn(`${fileName}の読み込みに失敗:`, (error as Error).message)
    return null
  }
}

/**
 * 全てのJSONファイルから同期的にPedigreeListを生成する
 */
export function createPedigreeListFromJson(): Map<string, Horse> {
  const pedigreeMap = new Map<string, Horse>()
  const mapping = ensureRootHorseIdMapInitialized()

  mapping.forEach((fileName, rootHorseId) => {
    const horse = loadPedigreeFromJsonFile(fileName)
    if (horse) {
      pedigreeMap.set(rootHorseId, horse)
    }
  })

  return pedigreeMap
}

function createPedigreeList(): Map<string, Horse> {
  return createPedigreeListFromJson()
}

const pedigreeCache = new Map<string, Horse>()
let rootHorseIdToFileMap: Map<string, string> | null = null

/**
 * rootHorseId → ファイル名のマッピングを初期化
 * pedigree-metadata.jsonから軽量にロード
 */
function ensureRootHorseIdMapInitialized(): Map<string, string> {
  if (rootHorseIdToFileMap === null) {
    rootHorseIdToFileMap = new Map(Object.entries(pedigreeMetadata))
  }
  return rootHorseIdToFileMap
}

/**
 * 特定のrootHorseIdに対応するファミリーをオンデマンドで読み込む
 */
function loadPedigreeOnDemand(rootHorseId: string): Horse | null {
  if (pedigreeCache.has(rootHorseId)) {
    return pedigreeCache.get(rootHorseId)!
  }

  const mapping = ensureRootHorseIdMapInitialized()
  const fileName = mapping.get(rootHorseId)

  if (!fileName) {
    console.warn(`File not found for rootHorseId: ${rootHorseId}`)
    return null
  }

  const horse = loadPedigreeFromJsonFile(fileName)

  if (horse) {
    pedigreeCache.set(rootHorseId, horse)
  }

  return horse
}

/**
 * 牝系データを取得する（全てのファイルに対応）
 */
export async function getPedigree(key: string): Promise<Horse | null> {
  return loadPedigreeOnDemand(key)
}

/**
 * 利用可能な牝系のキー一覧を取得（JSONファイルのみ）
 */
export function getAvailablePedigreeKeys(): string[] {
  const mapping = ensureRootHorseIdMapInitialized()
  return Array.from(mapping.keys())
}

/**
 * horseIdから馬を検索し、必要に応じて個別にファイルをロード
 */
export async function findHorseByIdOnDemand(horseId: string): Promise<Horse | null> {
  try {
    const horseLinkMapData = await import('./horse-link-map.json')

    for (const [, data] of Object.entries(horseLinkMapData.default || horseLinkMapData)) {
      const linkData = data as { link: string; family: string; name: string }
      if (linkData.link === horseId) {
        const familyHorse = await getPedigree(linkData.family)
        if (familyHorse) {
          return findHorseInTree(familyHorse, horseId)
        }
      }
    }
    return null
  } catch (error) {
    console.error(`Failed to find horse by ID: ${horseId}`, error)
    return null
  }
}

function findHorseInTree(horse: Horse, targetId: string): Horse | null {
  if (horse.id === targetId) {
    return horse
  }
  if (horse.children) {
    for (const child of horse.children) {
      const found = findHorseInTree(child, targetId)
      if (found) return found
    }
  }
  return null
}

export { findHorseByName, findHorseById } from '@/data/pedigree/HorseList'

const pedigreeListProxy = new Proxy({} as Map<string, Horse>, {
  get(target, prop) {
    if (prop === 'get') {
      return (key: string) => loadPedigreeOnDemand(key)
    }

    if (prop === 'has') {
      return (key: string) => {
        const mapping = ensureRootHorseIdMapInitialized()
        return mapping.has(key) || pedigreeCache.has(key)
      }
    }

    if (prop === 'size') {
      return () => ensureRootHorseIdMapInitialized().size
    }

    if (prop === 'keys') {
      return () => ensureRootHorseIdMapInitialized().keys()
    }

    if (prop === 'values') {
      return () => {
        console.warn('pedigreeList.values() called - this will load all files')
        const mapping = ensureRootHorseIdMapInitialized()
        const values: Horse[] = []
        for (const rootHorseId of mapping.keys()) {
          const horse = loadPedigreeOnDemand(rootHorseId)
          if (horse) values.push(horse)
        }
        return values[Symbol.iterator]()
      }
    }

    if (prop === 'entries') {
      return () => {
        console.warn('pedigreeList.entries() called - this will load all files')
        const mapping = ensureRootHorseIdMapInitialized()
        const entries: [string, Horse][] = []
        for (const rootHorseId of mapping.keys()) {
          const horse = loadPedigreeOnDemand(rootHorseId)
          if (horse) entries.push([rootHorseId, horse])
        }
        return entries[Symbol.iterator]()
      }
    }

    if (prop === 'forEach') {
      return (callback: (value: Horse, key: string, map: Map<string, Horse>) => void) => {
        console.warn('pedigreeList.forEach() called - this will load all files')
        const mapping = ensureRootHorseIdMapInitialized()
        for (const rootHorseId of mapping.keys()) {
          const horse = loadPedigreeOnDemand(rootHorseId)
          if (horse) callback(horse, rootHorseId, pedigreeListProxy)
        }
      }
    }

    return undefined
  },
  has(target, prop) {
    if (typeof prop === 'string') {
      return ensureRootHorseIdMapInitialized().has(prop)
    }
    return false
  },
})

export default pedigreeListProxy
