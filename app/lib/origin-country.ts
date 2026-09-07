/**
 * 輸入馬（外国産の基礎牝馬・種牡馬）の生産国コード。
 * 表示は `(IRE)` `(GB)` のように馬名末尾へ付ける。輸入馬の先祖には付けない。
 */

const UNKNOWN_NAMES = new Set(['不詳', '不明', '【血統不明】', '未登録', '—', '-', ''])

/** 血統表・産駒表で使う国コード。JPN は付与しない */
const KNOWN_ORIGIN_CODES = new Set([
  'GB',
  'IRE',
  'US',
  'USA',
  'AUS',
  'NZ',
  'FR',
  'GER',
  'ITY',
  'ITA',
  'CAN',
  'SAF',
  'ARG',
  'BRZ',
  'CHI',
  'IND',
  'TUR',
  'RUS',
  'HUN',
  'SYR',
  'UAE',
  'KSA',
  'IRQ',
  'EGY',
  'PER',
  'URU',
  'MEX',
  'SPA',
  'BEL',
  'HOL',
  'DEN',
  'NOR',
  'POL',
  'GRE',
  'CZE',
  'AUT',
  'SUI',
  'SWE',
])

/**
 * 生産者・生産地の表記 → 国コード。
 * キーは完全一致。都道府県名や牧場名は載せない。
 */
const ORIGIN_CODE_BY_LABEL: Record<string, string> = {
  英: 'GB',
  英国: 'GB',
  イギリス: 'GB',
  イングランド: 'GB',
  GB: 'GB',
  愛: 'IRE',
  愛蘭: 'IRE',
  アイルランド: 'IRE',
  IRE: 'IRE',
  米: 'US',
  米国: 'US',
  アメリカ: 'US',
  US: 'US',
  USA: 'US',
  豪: 'AUS',
  豪州: 'AUS',
  オーストラリア: 'AUS',
  AUS: 'AUS',
  新: 'NZ',
  ニュージーランド: 'NZ',
  NZ: 'NZ',
  仏: 'FR',
  フランス: 'FR',
  FR: 'FR',
  独: 'GER',
  ドイツ: 'GER',
  GER: 'GER',
  伊: 'ITY',
  イタリア: 'ITY',
  ITY: 'ITY',
  ITA: 'ITY',
  加: 'CAN',
  カナダ: 'CAN',
  CAN: 'CAN',
  南: 'SAF',
  南ア: 'SAF',
  南阿: 'SAF',
  南アフリカ: 'SAF',
  SAF: 'SAF',
  亜: 'ARG',
  アルゼンチン: 'ARG',
  ARG: 'ARG',
  伯: 'BRZ',
  ブラジル: 'BRZ',
  BRZ: 'BRZ',
  智: 'CHI',
  チリ: 'CHI',
  CHI: 'CHI',
  印: 'IND',
  インド: 'IND',
  IND: 'IND',
  土: 'TUR',
  トルコ: 'TUR',
  TUR: 'TUR',
  露: 'RUS',
  ロシア: 'RUS',
  RUS: 'RUS',
  洪: 'HUN',
  ハンガリー: 'HUN',
  HUN: 'HUN',
  叙: 'SYR',
  シリア: 'SYR',
  SYR: 'SYR',
  叔: 'IRQ',
  イラク: 'IRQ',
  メソポタミヤ: 'IRQ',
  メソポタミア: 'IRQ',
  IRQ: 'IRQ',
  沙: 'KSA',
  サウジアラビア: 'KSA',
  KSA: 'KSA',
  蘭: 'HOL',
  オランダ: 'HOL',
  HOL: 'HOL',
  白: 'BEL',
  ベルギー: 'BEL',
  BEL: 'BEL',
  西: 'SPA',
  スペイン: 'SPA',
  SPA: 'SPA',
  埃: 'EGY',
  エジプト: 'EGY',
  EGY: 'EGY',
}

const TRAILING_PAREN_RE = /[（(]([^）)]*)[）)]\s*$/u

export type HorseOriginFields = {
  name?: string
  importedYear?: string
  breeder?: string
  foaledAt?: string
}

/** 馬名末尾の括弧を除去（国名・年・その他を問わない） */
export function stripTrailingCountryParen(name: string): string {
  return (name || '').trim().replace(TRAILING_PAREN_RE, '').trim()
}

export function isUnknownHorseName(name: string | undefined | null): boolean {
  const t = (name || '').trim()
  if (!t) return true
  return UNKNOWN_NAMES.has(t) || UNKNOWN_NAMES.has(stripTrailingOriginCodeParen(t))
}

function normalizeOriginCode(raw: string | undefined | null): string | null {
  const t = (raw || '').trim()
  if (!t) return null
  const mapped = ORIGIN_CODE_BY_LABEL[t] || ORIGIN_CODE_BY_LABEL[t.toUpperCase()]
  if (mapped) return mapped
  const upper = t.toUpperCase()
  if (KNOWN_ORIGIN_CODES.has(upper) && upper !== 'JPN') {
    return ORIGIN_CODE_BY_LABEL[upper] || upper
  }
  return null
}

/** 生産者・生産地の短い表記から国コードを返す */
export function originCodeFromLabel(label: string | undefined | null): string | null {
  const t = (label || '').trim()
  if (!t) return null
  return normalizeOriginCode(t) || normalizeOriginCode(t.replace(/[（）()]/g, ''))
}

/** 馬名末尾が既知の国コードならそれを返す */
export function extractTrailingCountryCode(name: string | undefined | null): string | null {
  const t = (name || '').trim()
  if (!t) return null
  const m = t.match(TRAILING_PAREN_RE)
  if (!m) return null
  return normalizeOriginCode(m[1].trim())
}

/** 末尾が国コードのときだけ括弧を外す。`馬名(1954)` は残す */
export function stripTrailingOriginCodeParen(name: string): string {
  const t = (name || '').trim()
  if (!extractTrailingCountryCode(t)) return t
  return stripTrailingCountryParen(t)
}

function isDomesticOriginNote(importedYear: string | undefined): boolean {
  const t = (importedYear || '').trim()
  return Boolean(t) && t.includes('内国産')
}

/**
 * この馬本人が輸入馬（外国産）なら生産国コード。
 * 先祖ノードには breeder / importedYear が無い前提。
 */
export function originCodeFromHorse(horse: HorseOriginFields | undefined | null): string | null {
  if (!horse) return null
  if (isDomesticOriginNote(horse.importedYear)) return null
  return (
    originCodeFromLabel(horse.foaledAt) ||
    originCodeFromLabel(horse.breeder) ||
    extractTrailingCountryCode(horse.name) ||
    null
  )
}

/** 馬名に生産国コードを付ける。不明馬・国内産は付けない。既存の国名括弧は置き換える */
export function formatNameWithOrigin(name: string, originCode?: string | null): string {
  const base = stripTrailingOriginCodeParen(name)
  if (isUnknownHorseName(base)) return base || (name || '').trim()
  const code = normalizeOriginCode(originCode)
  if (!code) return base
  return `${base}(${code})`
}
