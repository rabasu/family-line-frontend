import { Horse } from '@/types/Horse'
import { loadPedigreeFromJson, convertJsonToHorse, PedigreeJsonData } from '../lib/pedigree-loader'

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
const jsonContext = require.context('./', false, /\.json$/)

// require.contextによる完全自動化システム

/**
 * require.contextを使用してJSONファイルを自動的に検出・読み込み
 * ファイル名を手動で列挙する必要がなく、新規追加・変更に自動対応
 */
function getAvailableJsonFiles(): string[] {
  // 初期化済みのcontextを使用
  const allKeys = jsonContext.keys()

  // ファイル名のみを取得（ディレクトリパスを除去）
  const files = allKeys
    .map((key) => key.replace('./', '')) // './' を除去
    .filter((fileName) => !fileName.includes('/')) // サブディレクトリを除外
    .filter((fileName) => fileName.endsWith('.json')) // .jsonファイルのみ
    .filter((fileName) => !fileName.includes('.backup')) // .backupファイルを除外

  return files
}

/**
 * 指定されたJSONファイルを動的に読み込む
 */
async function loadJsonFile(fileName: string): Promise<JsonFileData> {
  const variableName = generateVariableName(fileName)
  const keyName = generateKeyName(fileName)

  try {
    // pedigree-loader.tsのloadPedigreeFromJsonを使用
    const horse = await loadPedigreeFromJson(`./${fileName}`)

    return {
      fileName,
      variableName,
      keyName,
      data: null, // 元のJSONデータは不要
      horse,
    }
  } catch (error) {
    console.error(`JSONファイルの読み込みに失敗: ${fileName}`, error)
    return {
      fileName,
      variableName,
      keyName,
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

    return convertJsonToHorse(pedigreeData)
  } catch (error) {
    console.warn(`${fileName}の読み込みに失敗:`, error.message)
    return null
  }
}

/**
 * 全てのJSONファイルから同期的にPedigreeListを生成する
 */
function createPedigreeListFromJson(): Map<string, Horse> {
  const pedigreeMap = new Map<string, Horse>()
  const jsonFiles = getAvailableJsonFiles()

  // 全てのJSONファイルを同期的に読み込み
  jsonFiles.forEach((fileName) => {
    const keyName = generateKeyName(fileName)
    const horse = loadPedigreeFromJsonFile(fileName)
    if (horse) {
      pedigreeMap.set(keyName, horse)
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

// JSONファイル自動読み込み + TSXファイル後方互換性の同期Map
const pedigreeList = createPedigreeList()

/**
 * 牝系データを取得する（全てのファイルに対応）
 */
export async function getPedigree(key: string): Promise<Horse | null> {
  // まず同期Mapをチェック（初期化済みの場合）
  if (pedigreeList.has(key)) {
    return pedigreeList.get(key)!
  }

  // 動的読み込みを試す（初期化中または新しいファイルの場合）
  return await getPedigreeData(key)
}

/**
 * 利用可能な牝系のキー一覧を取得（JSONファイルのみ）
 */
export function getAvailablePedigreeKeys(): string[] {
  const keys: string[] = []

  // JSONファイルから生成されたキーを追加
  const jsonFiles = getAvailableJsonFiles()
  jsonFiles.forEach((fileName) => {
    const keyName = generateKeyName(fileName)
    keys.push(keyName)
  })

  return keys
}

export default pedigreeList
