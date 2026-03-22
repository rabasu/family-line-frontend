'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Link from '@/components/Link'
import siteMetadata from '@/data/siteMetadata'
import NewsletterForm from 'pliny/ui/NewsletterForm'
import type { TraditionalFamily } from '@/types/TraditionalFamily'
import FamilyFilterModal, { type FilterState, EMPTY_FILTER, countActiveFilters, getDecade } from '@/components/FamilyFilterModal'

type SortKey = 'name' | 'foaled' | 'importedYear'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: '馬名' },
  { value: 'foaled', label: '生年' },
  { value: 'importedYear', label: '輸入年' },
]

function sortFamilies(families: TraditionalFamily[], sortKey: SortKey): TraditionalFamily[] {
  return [...families].sort((a, b) => {
    // 【血統不明】はあらゆるソートで常に最後尾
    if (a.slug === '_unknown' && b.slug !== '_unknown') return 1
    if (a.slug !== '_unknown' && b.slug === '_unknown') return -1
    if (a.slug === '_unknown' && b.slug === '_unknown') return 0

    const valA = (a[sortKey] ?? '') as string
    const valB = (b[sortKey] ?? '') as string
    return valA.localeCompare(valB, 'ja')
  })
}

function formatValue(value: string | undefined): string {
  return value && value.trim() ? value : '—'
}

const SCROLL_THRESHOLD = 10

export default function Home({ families }: { families: TraditionalFamily[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const activeFilterCount = countActiveFilters(filter)

  const barRef = useRef<HTMLDivElement>(null)
  const [barHeight, setBarHeight] = useState(0)
  const barNaturalBottomRef = useRef(0)
  const floatingRef = useRef(false)

  const [scrollingDown, setScrollingDown] = useState(false)
  const [barPastViewport, setBarPastViewport] = useState(false)

  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const measure = () => {
      setBarHeight(el.offsetHeight)
      if (!floatingRef.current) {
        barNaturalBottomRef.current = el.getBoundingClientRect().bottom + window.scrollY
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onFrame = useCallback(() => {
    const y = window.scrollY

    if (y < SCROLL_THRESHOLD) {
      setScrollingDown(false)
    } else if (y - lastScrollY.current > SCROLL_THRESHOLD) {
      setScrollingDown(true)
    } else if (lastScrollY.current - y > SCROLL_THRESHOLD) {
      setScrollingDown(false)
    }

    const bottom = barNaturalBottomRef.current
    const height = barRef.current?.offsetHeight ?? 0
    const shouldFloat = floatingRef.current ? y > bottom - height : y > bottom
    if (shouldFloat !== floatingRef.current) {
      floatingRef.current = shouldFloat
      setBarPastViewport(shouldFloat)
    }

    lastScrollY.current = Math.max(0, y)
    ticking.current = false
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(onFrame)
        ticking.current = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onFrame])

  useEffect(() => {
    const handleResize = () => {
      if (!floatingRef.current && barRef.current) {
        barNaturalBottomRef.current = barRef.current.getBoundingClientRect().bottom + window.scrollY
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const shouldScrollRef = useRef(false)

  const filteredAndSorted = useMemo(() => {
    let result = families

    if (searchQuery.trim()) {
      const q = searchQuery.trim()
      result = result.filter((f) => f.name.includes(q))
    }

    if (filter.breeds.length > 0) {
      result = result.filter((f) => f.breed && filter.breeds.includes(f.breed))
    }
    if (filter.breeders.length > 0) {
      result = result.filter((f) => f.breeder && filter.breeders.includes(f.breeder))
    }
    if (filter.owners.length > 0) {
      result = result.filter((f) => f.owner && filter.owners.includes(f.owner))
    }
    if (filter.foaledDecades.length > 0) {
      result = result.filter((f) => {
        const decade = getDecade(f.foaled)
        return decade !== null && filter.foaledDecades.includes(decade)
      })
    }
    if (filter.importedDecades.length > 0) {
      result = result.filter((f) => {
        const decade = getDecade(f.importedYear)
        return decade !== null && filter.importedDecades.includes(decade)
      })
    }

    return sortFamilies(result, sortKey)
  }, [families, searchQuery, filter, sortKey])

  useEffect(() => {
    if (shouldScrollRef.current) {
      shouldScrollRef.current = false
      const barTop = barNaturalBottomRef.current - barHeight
      window.scrollTo({ top: Math.max(0, barTop), behavior: 'smooth' })
    }
  }, [filteredAndSorted, barHeight])

  const handleSortChange = (key: SortKey) => {
    if (key === sortKey) return
    setSortKey(key)
    shouldScrollRef.current = true
  }

  const handleFilterApply = (newFilter: FilterState) => {
    setFilter(newFilter)
    shouldScrollRef.current = true
  }

  const isFloating = barPastViewport
  const showFloatingBar = isFloating && !scrollingDown

  const barContent = (
    <div ref={barRef} className="space-y-3 py-3">
      {/* Search */}
      <div className="relative">
        <label htmlFor="name-search" className="sr-only">
          馬名で検索
        </label>
        <input
          id="name-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="馬名で検索..."
          className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:max-w-xs"
          aria-label="馬名で検索"
        />
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
      </div>

      {/* Sort tabs + Filter button */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="ソート順">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={sortKey === opt.value}
              onClick={() => handleSortChange(opt.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                sortKey === opt.value
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className="relative inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z"
              clipRule="evenodd"
            />
          </svg>
          <span className="hidden sm:inline">絞り込み</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-500 px-1 text-xs font-bold text-white">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {filteredAndSorted.length}件{(searchQuery.trim() || activeFilterCount > 0) && ` / ${families.length}件中`}
      </p>
    </div>
  )

  return (
    <>
      <div className="min-w-0">
        {/* Static header */}
        <div className="space-y-2 pb-4 pt-6">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">在来牝系一覧</h1>
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">{siteMetadata.description}</p>
        </div>

        {/* Spacer: preserves layout when bar is floating */}
        {isFloating && <div style={{ height: barHeight }} aria-hidden="true" />}

        {/* Filter bar — in-flow normally, fixed overlay when scrolled completely past */}
        <div
          className={
            isFloating
              ? `fixed left-0 right-0 top-0 z-40 border-b border-gray-200 bg-white/95 pl-[calc(100vw-100%)] backdrop-blur transition-transform duration-300 dark:border-gray-700 dark:bg-gray-950/95 ${
                  showFloatingBar ? 'translate-y-0' : '-translate-y-full'
                }`
              : '-mx-4 border-b border-gray-200 bg-white/95 px-4 backdrop-blur dark:border-gray-700 dark:bg-gray-950/95 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0'
          }
        >
          <div className={isFloating ? 'mx-auto max-w-3xl px-4 sm:px-6 xl:max-w-5xl xl:px-0' : ''}>{barContent}</div>
        </div>

        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {!filteredAndSorted.length && <li className="py-8 text-center text-gray-500 dark:text-gray-400">条件に一致する牝系が見つかりません。</li>}
          {filteredAndSorted.map((family) => {
            const isPlaceholder = family.slug === '_unknown'
            return (
              <li key={family.slug} className={`py-4 ${isPlaceholder ? 'opacity-75' : ''}`}>
                <article className={`min-w-0 overflow-hidden ${isPlaceholder ? 'text-gray-500 dark:text-gray-500' : ''}`}>
                  <div className="space-y-2">
                    <h2 className={`text-xl leading-8 tracking-tight ${isPlaceholder ? 'font-medium' : 'font-bold'}`}>
                      <Link
                        href={`/family/${family.slug}`}
                        className={
                          isPlaceholder
                            ? 'text-gray-500 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400'
                            : 'text-gray-900 hover:text-primary-500 dark:text-gray-100 dark:hover:text-primary-400'
                        }
                      >
                        {formatValue(family.name)}
                      </Link>
                    </h2>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 md:grid-cols-4">
                      <div className="min-w-0 break-words">
                        <dt className="inline font-medium">品種: </dt>
                        <dd className="inline">{formatValue(family.breed)}</dd>
                      </div>
                      <div className="min-w-0 break-words">
                        <dt className="inline font-medium">生年: </dt>
                        <dd className="inline">{formatValue(family.foaled)}</dd>
                      </div>
                      <div className="min-w-0 break-words">
                        <dt className="inline font-medium">輸入年: </dt>
                        <dd className="inline">{formatValue(family.importedYear)}</dd>
                      </div>
                      <div className="min-w-0 break-words">
                        <dt className="inline font-medium">生産: </dt>
                        <dd className="inline">{formatValue(family.breeder)}</dd>
                      </div>
                      <div className="col-span-2 min-w-0 break-words md:col-span-4">
                        <dt className="inline font-medium">所有者: </dt>
                        <dd className="inline">{formatValue(family.owner)}</dd>
                      </div>
                    </dl>
                    <div className="text-base font-medium leading-6">
                      <Link
                        href={`/family/${family.slug}`}
                        className={
                          isPlaceholder ? 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400' : 'text-primary-500 hover:text-primary-600 dark:hover:text-primary-400'
                        }
                        aria-label={`${family.name}の牝系ページへ`}
                      >
                        詳細を見る →
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </div>

      <FamilyFilterModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} families={families} filter={filter} onApply={handleFilterApply} />

      {siteMetadata.newsletter?.provider && (
        <div className="flex items-center justify-center pt-4">
          <NewsletterForm />
        </div>
      )}
    </>
  )
}
