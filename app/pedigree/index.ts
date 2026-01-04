import { Horse } from '@/types/Horse'
import { loadPedigreeFromJson, convertJsonToHorse, PedigreeJsonData } from '../lib/pedigree-loader'
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
// 現在のディレクトリ（app/pedigree）内の.jsonファイルを検出
// .backup.jsonファイルは除外（正規表現で.backupを含まないファイルのみマッチ）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonContext = (require as any).context('./', false, /^\.\/(?!.*\.backup)[^/]+\.json$/)

// require.contextによる完全自動化システム

/**
 * 在来牝系のJSONファイルを取得
 * pedigree-metadata.jsonから取得（既に在来牝系のみが含まれている）
 */
function getAvailableJsonFiles(): string[] {
  // pedigree-metadata.jsonから在来牝系のファイル名を取得
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
    // JSONファイルを直接読み込んでmetadata.rootHorseIdを取得
    const pedigreeData = (await import(`./${fileName}`)) as PedigreeJsonData

    // 在来牝系チェック
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

    // pedigree-loader.tsのloadPedigreeFromJsonを使用
    const horse = await loadPedigreeFromJson(`./${fileName}`)

    return {
      fileName,
      variableName,
      keyName: rootHorseId, // rootHorseIdをキーとして使用
      data: pedigreeData,
      horse,
    }
  } catch (error) {
    console.error(`JSONファイルの読み込みに失敗: ${fileName}`, error)
    return {
      fileName,
      variableName,
      keyName: generateKeyName(fileName), // フォールバック
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

// 動的にJSONファイルを読み込み（初期化時は空配列、必要時に読み込み）
let jsonFilesData: JsonFileData[] = []

// require.contextによる完全自動化システム

// 動的読み込みされたJSONファイルのキャッシュ
const jsonHorseCache = new Map<string, Horse | null>()

type PedigreeList = {
  [key: string]: Horse
}

/**
 * 牝系データを取得する（TSXファイルとJSONファイルの両方に対応）
 */
async function getPedigreeData(key: string): Promise<Horse | null> {
  try {
    // キャッシュをチェック
    if (jsonHorseCache.has(key)) {
      return jsonHorseCache.get(key)!
    }

    // jsonFilesDataが空の場合は初期化
    if (jsonFilesData.length === 0) {
      jsonFilesData = await loadAllJsonFiles()
    }

    // 動的に読み込まれたJSONファイルから検索
    const jsonFileData = jsonFilesData.find((data) => data.keyName === key)
    if (jsonFileData && jsonFileData.horse) {
      jsonHorseCache.set(key, jsonFileData.horse)
      return jsonFileData.horse
    }

    // ファイルが存在しない場合は動的に読み込みを試行
    const fileName = jsonFilesData.find((data) => data.keyName === key)?.fileName
    if (fileName) {
      const horse = await loadPedigreeFromJson(`./${fileName}`)
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
 * 動的インポートの問題を回避し、webpackが適切にバンドルできる
 * 在来牝系のみを対象とする
 * @returns {Horse | null} 変換されたHorseオブジェクト、またはnull
 */
function loadPedigreeFromJsonFile(fileName: string): Horse | null {
  try {
    // .backupファイルや不正なファイルを除外
    if (fileName.includes('.backup') || fileName.includes('.tmp') || !fileName.endsWith('.json')) {
      console.warn(`${fileName}をスキップします (unsupported file)`)
      return null
    }

    // 初期化済みのcontextを使用
    const key = `./${fileName}`
    if (!jsonContext.keys().includes(key)) {
      console.warn(`${fileName}が見つかりません`)
      return null
    }

    const pedigreeData = jsonContext(key)

    // データの基本構造をチェック
    if (!pedigreeData || !pedigreeData.metadata || !pedigreeData.horses || !Array.isArray(pedigreeData.horses)) {
      console.warn(`${fileName}: 不正なデータ構造`)
      return null
    }

    // 在来牝系チェック
    if (pedigreeData.metadata.isTraditionalFamily !== true) {
      console.warn(`${fileName}は在来牝系ではないためスキップします`)
      return null
    }

    return convertJsonToHorse(pedigreeData)
  } catch (error) {
    console.warn(`${fileName}の読み込みに失敗:`, error.message)
    return null
  }
}

// getRootHorseIdFromFile関数は削除 - pedigree-metadata.jsonから取得

/**
 * 全てのJSONファイルから同期的にPedigreeListを生成する
 * （注：この関数は直接使用されない - オンデマンドロードが推奨）
 */
export function createPedigreeListFromJson(): Map<string, Horse> {
  const pedigreeMap = new Map<string, Horse>()
  const mapping = ensureRootHorseIdMapInitialized()

  // メタデータマップから読み込み
  mapping.forEach((fileName, rootHorseId) => {
    const horse = loadPedigreeFromJsonFile(fileName)
    if (horse) {
      pedigreeMap.set(rootHorseId, horse)
    }
  })

  return pedigreeMap
}

/**
 * 牝系データのMap（require.contextによる完全自動化）
 */
function createPedigreeList(): Map<string, Horse> {
  // JSONファイルから同期的にMapを生成
  const jsonPedigrees = createPedigreeListFromJson()

  return jsonPedigrees
}

// オンデマンド読み込み用のキャッシュ
// キー: rootHorseId, 値: Horseオブジェクト
const pedigreeCache = new Map<string, Horse>()

// 軽量マッピング: rootHorseId → ファイル名
// このマップは全ファイルをスキャンするが、実際の内容は読み込まない
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
  // キャッシュをチェック
  if (pedigreeCache.has(rootHorseId)) {
    return pedigreeCache.get(rootHorseId)!
  }

  // マッピングを初期化
  const mapping = ensureRootHorseIdMapInitialized()
  const fileName = mapping.get(rootHorseId)

  if (!fileName) {
    console.warn(`File not found for rootHorseId: ${rootHorseId}`)
    return null
  }

  // ファイルを読み込む
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
  // オンデマンド読み込みを使用
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
 * @param horseId 馬のID
 * @returns Horse | null
 */
export async function findHorseByIdOnDemand(horseId: string): Promise<Horse | null> {
  try {
    // horse-link-mapから family を取得
    const horseLinkMapData = await import('./horse-link-map.json')

    // horseIdに一致するエントリを探す
    for (const [, data] of Object.entries(horseLinkMapData.default || horseLinkMapData)) {
      const linkData = data as { link: string; family: string; name: string }
      if (linkData.link === horseId) {
        // familyファイルをロード
        const familyHorse = await getPedigree(linkData.family)
        if (familyHorse) {
          // familyツリー内から該当馬を再帰検索
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

/**
 * ツリー内から馬IDで検索（再帰）
 */
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

// findHorseByNameとfindHorseByIdはHorseList.tsxから再エクスポート
// 注意: これらは軽量マップを使用するため、完全なHorseオブジェクトは返さない
export { findHorseByName, findHorseById } from './HorseList'

// デフォルトエクスポート: オンデマンド読み込みされたpedigreeListへのアクセサ
// 直接アクセスする場合はget()メソッドを使用する
const pedigreeListProxy = new Proxy({} as Map<string, Horse>, {
  get(target, prop) {
    // Map APIをエミュレート
    if (prop === 'get') {
      return (key: string) => {
        return loadPedigreeOnDemand(key)
      }
    }

    if (prop === 'has') {
      return (key: string) => {
        const mapping = ensureRootHorseIdMapInitialized()
        return mapping.has(key) || pedigreeCache.has(key)
      }
    }

    if (prop === 'size') {
      const mapping = ensureRootHorseIdMapInitialized()
      return mapping.size
    }

    if (prop === 'keys') {
      return () => {
        const mapping = ensureRootHorseIdMapInitialized()
        return mapping.keys()
      }
    }

    if (prop === 'values') {
      return () => {
        // 全ての値を取得する場合は全ファイルを読み込む必要がある
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
        // 全てのエントリを取得する場合は全ファイルを読み込む必要がある
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

    // その他のプロパティ（Symbol.iteratorなど）
    return undefined
  },
  has(target, prop) {
    if (typeof prop === 'string') {
      const mapping = ensureRootHorseIdMapInitialized()
      return mapping.has(prop)
    }
    return false
  },
})

export default pedigreeListProxy
