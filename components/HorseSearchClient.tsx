'use client'

import { useState, useMemo } from 'react'
import { HorseSearchEntry } from '@/types/HorseSearchEntry'
import HorseSearchCard from './HorseSearchCard'

type FilterMode = 'all' | 'placed' | 'win' | 'g1win'

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'placed', label: '重賞入着馬（3着以内）' },
  { value: 'win', label: '重賞勝ち馬' },
  { value: 'g1win', label: 'G1級競走勝ち馬' },
]

const NAME_FIELDS = ['name', 'pedigreeName', 'formerName', 'localName', 'formerPedigreeName', 'linkName', 'linkPedigreeName', 'englishName'] as const

function getNames(entry: HorseSearchEntry): string[] {
  return NAME_FIELDS.map((f) => entry[f]).filter((v): v is string => typeof v === 'string')
}

function applyFilter(entry: HorseSearchEntry, mode: FilterMode): boolean {
  switch (mode) {
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

function sortKey(entry: HorseSearchEntry): string {
  if (entry.furigana) return entry.furigana
  return entry.name ?? entry.pedigreeName ?? entry.englishName ?? entry.formerName ?? entry.linkName ?? entry.id
}

function sortByName(a: HorseSearchEntry, b: HorseSearchEntry): number {
  const cmp = sortKey(a).localeCompare(sortKey(b), 'ja', { sensitivity: 'base' })
  if (cmp !== 0) return cmp
  const ya = a.foaled.year ?? 9999
  const yb = b.foaled.year ?? 9999
  if (ya !== yb) return ya - yb
  return a.id.localeCompare(b.id)
}

interface Props {
  data: HorseSearchEntry[]
}

export default function HorseSearchClient({ data }: Props) {
  const [query, setQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  const results = useMemo(() => {
    const q = query.trim()

    // フィルタ適用
    const filtered = data.filter((entry) => applyFilter(entry, filterMode))

    if (!q) {
      return { exact: [], partial: filtered.slice().sort(sortByName) }
    }

    const exact: HorseSearchEntry[] = []
    const partial: HorseSearchEntry[] = []

    for (const entry of filtered) {
      const names = getNames(entry)
      if (names.some((n) => n === q)) {
        exact.push(entry)
      } else if (names.some((n) => n.includes(q))) {
        partial.push(entry)
      }
    }

    exact.sort(sortByName)
    partial.sort(sortByName)

    return { exact, partial }
  }, [query, filterMode, data])

  const totalCount = results.exact.length + results.partial.length
  const showQuery = query.trim()

  return (
    <div className="space-y-4">
      {/* 検索入力 */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="馬名（競走名・血統名・英語名など）を入力"
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
        />
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {FILTER_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
            <input type="radio" name="horse-filter" value={opt.value} checked={filterMode === opt.value} onChange={() => setFilterMode(opt.value)} className="accent-primary-500" />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      {/* 件数表示 */}
      {showQuery && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          「{showQuery}」の検索結果：{totalCount} 件
        </p>
      )}
      {!showQuery && filterMode !== 'all' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {FILTER_OPTIONS.find((o) => o.value === filterMode)?.label}：{totalCount} 件
        </p>
      )}

      {/* 検索結果 */}
      <div className="space-y-1">
        {/* 完全一致グループ */}
        {results.exact.length > 0 && (
          <>
            {showQuery && <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">完全一致</p>}
            {results.exact.map((entry) => (
              <HorseSearchCard key={`${entry.family}-${entry.id}`} entry={entry} />
            ))}
          </>
        )}

        {/* 部分一致グループ */}
        {results.partial.length > 0 && (
          <>
            {showQuery && results.exact.length > 0 && <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">部分一致</p>}
            {results.partial.map((entry) => (
              <HorseSearchCard key={`${entry.family}-${entry.id}`} entry={entry} />
            ))}
          </>
        )}

        {/* 検索結果なし */}
        {showQuery && totalCount === 0 && <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">該当する馬が見つかりませんでした。</p>}

        {/* 未入力かつフィルタなし */}
        {!showQuery && filterMode === 'all' && <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">馬名を入力するか、絞り込み条件を選択してください。</p>}
      </div>
    </div>
  )
}
