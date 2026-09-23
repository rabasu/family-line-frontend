'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { HorseSearchEntry } from '@/types/HorseSearchEntry'
import HorseSearchCard from './HorseSearchCard'
import {
  SEARCH_FACETS,
  SEARCH_GRADES,
  activeSearchFacets,
  hasSearchCriteria,
  horseSearchQueryString,
  matchHorseName,
  matchesSearchFacets,
  parseHorseSearchQuery,
  resolveFacetOption,
  searchFacetLabel,
  sortHorseSearch,
  unwrapEstimatedParens,
  withSearchFacet,
  withoutSearchFacet,
  type HorseSearchQuery,
  type SearchFacetKey,
  type SearchGrade,
} from '@/lib/horse-search'

function familyDisplayName(familyNames: Map<string, string>, value: string): string {
  const name = familyNames.get(value) || value
  return name.endsWith('系') ? name : `${name}系`
}

function resolveFamilyValue(familyNames: Map<string, string>, input: string): string {
  const trimmed = input.trim()
  if (familyNames.has(trimmed)) return trimmed
  for (const [id, name] of familyNames) {
    if (name === trimmed) return id
  }
  return trimmed
}

function addFacetOption(set: Set<string>, value?: string) {
  if (!value) return
  const canonical = unwrapEstimatedParens(value)
  if (canonical) set.add(canonical)
}

function buildFacetOptions(data: HorseSearchEntry[]): Record<SearchFacetKey, string[]> {
  const sets: Record<SearchFacetKey, Set<string>> = {
    sire: new Set(),
    dam: new Set(),
    family: new Set(),
    breeder: new Set(),
    owner: new Set(),
    trainer: new Set(),
  }
  for (const entry of data) {
    addFacetOption(sets.sire, entry.sire)
    addFacetOption(sets.dam, entry.dam)
    addFacetOption(sets.family, entry.familyName)
    addFacetOption(sets.breeder, entry.breeder)
    addFacetOption(sets.owner, entry.owner)
    addFacetOption(sets.trainer, entry.trainer)
  }
  const sorted = {} as Record<SearchFacetKey, string[]>
  for (const key of SEARCH_FACETS.map((f) => f.key)) {
    sorted[key] = [...sets[key]].sort((a, b) => a.localeCompare(b, 'ja'))
  }
  return sorted
}

function FacetSuggestField({
  value,
  onChange,
  onCommit,
  suggestions,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  onCommit: (value: string) => void
  suggestions: string[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setHighlight(0)
  }, [suggestions])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[highlight] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  const showList = open && suggestions.length > 0

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    onCommit(trimmed)
    setOpen(false)
  }

  return (
    <div
      className="relative min-w-[12rem] flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
      }}
    >
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls="horse-search-facet-list"
        aria-autocomplete="list"
        aria-activedescendant={showList ? `horse-search-facet-option-${highlight}` : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            if (suggestions.length === 0) return
            setHighlight((i) => (i + 1) % suggestions.length)
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
            if (suggestions.length === 0) return
            setHighlight((i) => (i - 1 + suggestions.length) % suggestions.length)
            return
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
            return
          }
          if (e.key === 'Enter') {
            e.preventDefault()
            if (showList && suggestions[highlight]) commit(suggestions[highlight])
            else commit(value)
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-theme bg-white px-3 py-1.5 text-sm text-heading placeholder:text-muted focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600 dark:bg-gray-800"
      />
      {showList && (
        <ul
          ref={listRef}
          id="horse-search-facet-list"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-theme bg-white py-1 shadow-lg dark:bg-gray-800"
        >
          {suggestions.map((option, index) => (
            <li key={option} role="presentation">
              <button
                type="button"
                id={`horse-search-facet-option-${index}`}
                role="option"
                aria-selected={index === highlight}
                className={`block w-full px-3 py-1.5 text-left text-sm text-heading ${index === highlight ? 'bg-label' : 'hover:bg-label'}`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface Props {
  data: HorseSearchEntry[]
}

export default function HorseSearchClient({ data }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const urlQs = searchParams.toString()
  const urlQuery = useMemo(() => parseHorseSearchQuery(new URLSearchParams(urlQs)), [urlQs])
  const [query, setQuery] = useState(urlQuery)

  const [nameInput, setNameInput] = useState(urlQuery.q ?? '')
  const [facetKey, setFacetKey] = useState<SearchFacetKey>('sire')
  const [facetInput, setFacetInput] = useState('')

  const queryRef = useRef(query)
  queryRef.current = query
  const skipUrlSyncRef = useRef(false)

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false
      return
    }
    setQuery(urlQuery)
    setNameInput(urlQuery.q ?? '')
  }, [urlQuery])

  const replaceQuery = (next: HorseSearchQuery) => {
    const qs = horseSearchQueryString(next)
    const href = qs ? `${pathname}?${qs}` : pathname
    skipUrlSyncRef.current = true
    setQuery(next)
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', href)
    }
    router.replace(href, { scroll: false })
  }

  useEffect(() => {
    const trimmed = nameInput.trim()
    const current = queryRef.current.q ?? ''
    if (trimmed === current) return
    const t = window.setTimeout(() => {
      const next: HorseSearchQuery = { ...queryRef.current }
      if (trimmed) next.q = trimmed
      else delete next.q
      replaceQuery(next)
    }, 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameInput])

  const facetOptions = useMemo(() => buildFacetOptions(data), [data])
  const familyNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of data) {
      if (!map.has(entry.family)) map.set(entry.family, entry.familyName)
    }
    return map
  }, [data])
  const suggestions = useMemo(() => {
    const q = facetInput.trim()
    const all = facetOptions[facetKey]
    if (!q) return all.slice(0, 40)
    const needle = unwrapEstimatedParens(q)
    return all.filter((value) => value.includes(q) || (needle !== q && value.includes(needle))).slice(0, 40)
  }, [facetOptions, facetKey, facetInput])

  const results = useMemo(() => {
    if (!hasSearchCriteria(query)) {
      return { exact: [] as HorseSearchEntry[], partial: [] as HorseSearchEntry[] }
    }
    const filtered = data.filter((entry) => matchesSearchFacets(entry, query))
    const q = query.q?.trim() ?? ''

    if (!q) {
      return { exact: [] as HorseSearchEntry[], partial: filtered.slice().sort(sortHorseSearch) }
    }

    const exact: HorseSearchEntry[] = []
    const partial: HorseSearchEntry[] = []
    for (const entry of filtered) {
      const match = matchHorseName(entry, q)
      if (match === 'exact') exact.push(entry)
      else if (match === 'partial') partial.push(entry)
    }
    exact.sort(sortHorseSearch)
    partial.sort(sortHorseSearch)
    return { exact, partial }
  }, [data, query])

  const totalCount = results.exact.length + results.partial.length
  const showNameQuery = Boolean(query.q?.trim())
  const facets = activeSearchFacets(query)
  const active = hasSearchCriteria(query)
  const grade: SearchGrade = query.grade ?? 'all'

  const addFacetValue = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    const value =
      facetKey === 'family'
        ? resolveFamilyValue(familyNames, trimmed)
        : resolveFacetOption(facetOptions[facetKey], trimmed)
    replaceQuery(withSearchFacet(query, facetKey, value))
    setFacetInput('')
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="馬名（競走名・血統名・英語名など）を入力"
          className="w-full rounded-md border border-theme bg-white px-4 py-2 text-sm text-heading shadow-sm placeholder:text-muted focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600 dark:bg-gray-800"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="horse-search-facet-key">
          絞り込みの属性
        </label>
        <select
          id="horse-search-facet-key"
          value={facetKey}
          onChange={(e) => {
            setFacetKey(e.target.value as SearchFacetKey)
            setFacetInput('')
          }}
          className="rounded-md border border-theme bg-white px-2 py-1.5 text-sm text-heading dark:bg-gray-800"
        >
          {SEARCH_FACETS.map((facet) => (
            <option key={facet.key} value={facet.key}>
              {facet.label}
            </option>
          ))}
        </select>
        <FacetSuggestField
          value={facetInput}
          onChange={setFacetInput}
          onCommit={addFacetValue}
          suggestions={suggestions}
          placeholder={`${searchFacetLabel(facetKey)}で絞り込む`}
        />
      </div>

      {facets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {facets.map((facet) => {
            const display = facet.key === 'family' ? familyDisplayName(familyNames, facet.value) : facet.value
            return (
              <span
                key={facet.key}
                className="inline-flex items-center gap-1 rounded-full border border-theme bg-label px-2.5 py-0.5 text-xs text-heading"
              >
                <span className="text-muted">{searchFacetLabel(facet.key)}</span>
                <span>{display}</span>
                <button
                  type="button"
                  onClick={() => replaceQuery(withoutSearchFacet(query, facet.key))}
                  className="text-subtle hover:text-heading"
                  aria-label={`${searchFacetLabel(facet.key)}「${display}」を外す`}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {SEARCH_GRADES.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="horse-filter"
              value={opt.value}
              checked={grade === opt.value}
              onChange={() => {
                const next: HorseSearchQuery = { ...query }
                if (opt.value === 'all') delete next.grade
                else next.grade = opt.value
                replaceQuery(next)
              }}
              className="accent-sky-700"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      {active && (
        <p className="text-sm text-muted">
          {showNameQuery ? `「${query.q}」の検索結果：` : '絞り込み結果：'}
          {totalCount} 件
        </p>
      )}

      <div className="space-y-1">
        {results.exact.length > 0 && (
          <>
            {showNameQuery && <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted">完全一致</p>}
            {results.exact.map((entry) => (
              <HorseSearchCard key={`${entry.family}-${entry.id}`} entry={entry} />
            ))}
          </>
        )}

        {results.partial.length > 0 && (
          <>
            {showNameQuery && results.exact.length > 0 && (
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted">部分一致</p>
            )}
            {results.partial.map((entry) => (
              <HorseSearchCard key={`${entry.family}-${entry.id}`} entry={entry} />
            ))}
          </>
        )}

        {active && totalCount === 0 && <p className="py-8 text-center text-sm text-muted">該当する馬が見つかりませんでした。</p>}

        {!active && (
          <p className="py-8 text-center text-sm text-muted">馬名を入力するか、属性・成績で絞り込んでください。</p>
        )}
      </div>
    </div>
  )
}
