import type { HorseSearchEntry } from '@/types/HorseSearchEntry'
import { stripTrailingOriginCodeParen } from '@/lib/origin-country'

export const SEARCH_FACETS = [
  { key: 'sire', label: '父' },
  { key: 'dam', label: '母' },
  { key: 'family', label: '牝系' },
  { key: 'breeder', label: '生産者' },
  { key: 'owner', label: '所有' },
  { key: 'trainer', label: '調教師' },
] as const

export type SearchFacetKey = (typeof SEARCH_FACETS)[number]['key']

export const SEARCH_GRADES = [
  { value: 'all', label: 'すべて' },
  { value: 'placed', label: '重賞入着馬（3着以内）' },
  { value: 'win', label: '重賞勝ち馬' },
  { value: 'g1win', label: 'G1級競走勝ち馬' },
] as const

export type SearchGrade = (typeof SEARCH_GRADES)[number]['value']

export type HorseSearchQuery = {
  q?: string
  sire?: string
  dam?: string
  family?: string
  breeder?: string
  owner?: string
  trainer?: string
  grade?: SearchGrade
}

const FACET_KEYS: SearchFacetKey[] = SEARCH_FACETS.map((f) => f.key)
const GRADE_VALUES = new Set<string>(SEARCH_GRADES.map((g) => g.value))

const NAME_FIELDS = [
  'name',
  'pedigreeName',
  'formerName',
  'localName',
  'formerPedigreeName',
  'linkName',
  'linkPedigreeName',
  'englishName',
] as const

export function searchFacetLabel(key: SearchFacetKey): string {
  return SEARCH_FACETS.find((f) => f.key === key)?.label ?? key
}

export function parseHorseSearchQuery(params: URLSearchParams): HorseSearchQuery {
  const query: HorseSearchQuery = {}
  const q = params.get('q')?.trim()
  if (q) query.q = q
  for (const key of FACET_KEYS) {
    const value = params.get(key)?.trim()
    if (value) query[key] = unwrapEstimatedParens(value)
  }
  const grade = params.get('grade')?.trim()
  if (grade && GRADE_VALUES.has(grade) && grade !== 'all') {
    query.grade = grade as SearchGrade
  }
  return query
}

/** クエリ文字列。キー順を固定して比較しやすくする */
export function horseSearchQueryString(query: HorseSearchQuery): string {
  const params = new URLSearchParams()
  if (query.q?.trim()) params.set('q', query.q.trim())
  for (const key of FACET_KEYS) {
    const value = query[key]?.trim()
    if (value) params.set(key, unwrapEstimatedParens(value))
  }
  if (query.grade && query.grade !== 'all') params.set('grade', query.grade)
  return params.toString()
}

export function horseSearchHref(query: HorseSearchQuery): string {
  const qs = horseSearchQueryString(query)
  return qs ? `/search?${qs}` : '/search'
}

export function hasSearchCriteria(query: HorseSearchQuery): boolean {
  if (query.q?.trim()) return true
  if (query.grade && query.grade !== 'all') return true
  return FACET_KEYS.some((key) => Boolean(query[key]?.trim()))
}

export function activeSearchFacets(query: HorseSearchQuery): Array<{ key: SearchFacetKey; value: string }> {
  const facets: Array<{ key: SearchFacetKey; value: string }> = []
  for (const key of FACET_KEYS) {
    const value = query[key]?.trim()
    if (value) facets.push({ key, value: unwrapEstimatedParens(value) })
  }
  return facets
}

export function withSearchFacet(query: HorseSearchQuery, key: SearchFacetKey, value: string): HorseSearchQuery {
  const next = { ...query }
  const trimmed = unwrapEstimatedParens(value.trim())
  if (trimmed) next[key] = trimmed
  else delete next[key]
  return next
}

export function withoutSearchFacet(query: HorseSearchQuery, key: SearchFacetKey): HorseSearchQuery {
  const next = { ...query }
  delete next[key]
  return next
}

/** 入力が候補の国名なし表記と一意に一致するなら、索引側の表記に寄せる */
export function resolveFacetOption(options: string[], input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed
  if (options.includes(trimmed)) return trimmed
  const base = normalizeSearchName(trimmed)
  const matches = options.filter((option) => normalizeSearchName(option) === base)
  if (matches.length === 1) return matches[0]
  return trimmed
}

function getNames(entry: HorseSearchEntry): string[] {
  return NAME_FIELDS.map((f) => entry[f]).filter((v): v is string => typeof v === 'string')
}

export function matchHorseName(entry: HorseSearchEntry, q: string): 'exact' | 'partial' | null {
  const trimmed = q.trim()
  if (!trimmed) return null
  const names = getNames(entry)
  if (names.some((n) => n === trimmed)) return 'exact'
  if (names.some((n) => n.includes(trimmed))) return 'partial'
  return null
}

function matchesFamily(entry: HorseSearchEntry, value: string): boolean {
  return entry.family === value || entry.familyName === value
}

const FULLY_WRAPPED_RE = /^[（(](.+)[）)]$/u

/** 全体が括弧で囲まれていれば推定表記。中身を取り出して同一視する */
export function unwrapEstimatedParens(value: string): string {
  let current = value.trim()
  for (;;) {
    const matched = current.match(FULLY_WRAPPED_RE)
    if (!matched) return current
    const inner = matched[1].trim()
    if (!inner || inner === current) return current
    current = inner
  }
}

/** 検索用の馬名。推定の全体括弧と末尾の (IRE) などは同一視する */
export function normalizeSearchName(value: string): string {
  return stripTrailingOriginCodeParen(unwrapEstimatedParens(value))
}

/** 父・母などの属性。完全一致、または国名括弧を除いた一致 */
export function facetNameMatches(entryValue: string | undefined, queryValue: string | undefined): boolean {
  if (!queryValue) return true
  if (!entryValue) return false
  if (entryValue === queryValue) return true
  const entryName = normalizeSearchName(entryValue)
  const queryName = normalizeSearchName(queryValue)
  return Boolean(entryName) && entryName === queryName
}

function matchesGrade(entry: HorseSearchEntry, grade: SearchGrade | undefined): boolean {
  switch (grade) {
    case 'placed':
      return entry.hasGradePlaced
    case 'win':
      return entry.hasGradeWin
    case 'g1win':
      return entry.hasG1Win
    default:
      return true
  }
}

/** 属性チップ・成績フィルタ。馬名は matchHorseName で別判定 */
export function matchesSearchFacets(entry: HorseSearchEntry, query: HorseSearchQuery): boolean {
  if (!matchesGrade(entry, query.grade)) return false
  if (!facetNameMatches(entry.sire, query.sire)) return false
  if (!facetNameMatches(entry.dam, query.dam)) return false
  if (query.family && !matchesFamily(entry, query.family)) return false
  if (!facetNameMatches(entry.breeder, query.breeder)) return false
  if (!facetNameMatches(entry.owner, query.owner)) return false
  if (!facetNameMatches(entry.trainer, query.trainer)) return false
  return true
}

export function sortHorseSearch(a: HorseSearchEntry, b: HorseSearchEntry): number {
  const ka = a.furigana || a.name || a.pedigreeName || a.englishName || a.formerName || a.linkName || a.id
  const kb = b.furigana || b.name || b.pedigreeName || b.englishName || b.formerName || b.linkName || b.id
  const cmp = ka.localeCompare(kb, 'ja', { sensitivity: 'base' })
  if (cmp !== 0) return cmp
  const ya = a.foaled.year ?? 9999
  const yb = b.foaled.year ?? 9999
  if (ya !== yb) return ya - yb
  return a.id.localeCompare(b.id)
}
