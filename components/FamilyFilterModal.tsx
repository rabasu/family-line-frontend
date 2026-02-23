'use client'

import { Fragment, useState, useEffect, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import type { TraditionalFamily } from '@/types/TraditionalFamily'

export type FilterState = {
  breeds: string[]
  breeders: string[]
  owners: string[]
  foaledDecades: string[]
  importedDecades: string[]
}

export const EMPTY_FILTER: FilterState = {
  breeds: [],
  breeders: [],
  owners: [],
  foaledDecades: [],
  importedDecades: [],
}

export function countActiveFilters(filter: FilterState): number {
  return filter.breeds.length + filter.breeders.length + filter.owners.length + filter.foaledDecades.length + filter.importedDecades.length
}

export function getDecade(year: string | undefined): string | null {
  if (!year || !year.trim()) return null
  const y = parseInt(year)
  if (isNaN(y)) return null
  return String(Math.floor(y / 10) * 10)
}

interface FilterOption {
  value: string
  label: string
  count: number
}

function getValueOptions(families: TraditionalFamily[], field: keyof TraditionalFamily): FilterOption[] {
  const counts: Record<string, number> = {}
  families.forEach((f) => {
    const val = f[field]
    if (val && val.trim()) counts[val] = (counts[val] || 0) + 1
  })
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b, 'ja'))
    .map(([value, count]) => ({ value, label: value, count }))
}

function getDecadeOptions(families: TraditionalFamily[], field: 'foaled' | 'importedYear'): FilterOption[] {
  const counts: Record<string, number> = {}
  families.forEach((f) => {
    const decade = getDecade(f[field])
    if (decade) counts[decade] = (counts[decade] || 0) + 1
  })
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([decade, count]) => ({ value: decade, label: `${decade}年代`, count }))
}

function FilterSection({
  title,
  options,
  selected,
  onChange,
  searchable = false,
}: {
  title: string
  options: FilterOption[]
  selected: string[]
  onChange: (values: string[]) => void
  searchable?: boolean
}) {
  const [search, setSearch] = useState('')

  const filteredOptions = searchable && search ? options.filter((o) => o.label.includes(search)) : options

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  return (
    <div className="py-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {searchable && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="検索..."
          className="mb-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      )}
      <div className="flex flex-wrap gap-1.5">
        {filteredOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selected.includes(opt.value)
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {opt.label}
            <span className="ml-1 opacity-60">({opt.count})</span>
          </button>
        ))}
        {filteredOptions.length === 0 && <p className="text-xs text-gray-400">該当なし</p>}
      </div>
    </div>
  )
}

interface FamilyFilterModalProps {
  isOpen: boolean
  onClose: () => void
  families: TraditionalFamily[]
  filter: FilterState
  onApply: (filter: FilterState) => void
}

export default function FamilyFilterModal({ isOpen, onClose, families, filter, onApply }: FamilyFilterModalProps) {
  const [draft, setDraft] = useState<FilterState>(filter)

  useEffect(() => {
    if (isOpen) {
      setDraft(filter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const breedOptions = useMemo(() => getValueOptions(families, 'breed'), [families])
  const breederOptions = useMemo(() => getValueOptions(families, 'breeder'), [families])
  const ownerOptions = useMemo(() => getValueOptions(families, 'owner'), [families])
  const foaledDecadeOptions = useMemo(() => getDecadeOptions(families, 'foaled'), [families])
  const importedDecadeOptions = useMemo(() => getDecadeOptions(families, 'importedYear'), [families])

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  const handleReset = () => {
    setDraft(EMPTY_FILTER)
  }

  const draftCount = countActiveFilters(draft)

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        {/* Panel wrapper */}
        <div className="fixed inset-0">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-y-full sm:translate-y-0 sm:translate-x-full"
            enterTo="translate-y-0 sm:translate-x-0"
            leave="transform transition ease-in-out duration-200"
            leaveFrom="translate-y-0 sm:translate-x-0"
            leaveTo="translate-y-full sm:translate-y-0 sm:translate-x-full"
          >
            <Dialog.Panel className="fixed inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-full sm:w-full sm:max-w-md sm:rounded-none">
              {/* Bottom sheet drag handle (SP only) */}
              <div className="flex shrink-0 justify-center pt-2 sm:hidden">
                <div className="h-1 w-8 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  絞り込み
                  {draftCount > 0 && <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs text-white">{draftCount}</span>}
                </Dialog.Title>
                <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <span className="sr-only">閉じる</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 divide-y divide-gray-200 overflow-y-auto overscroll-contain px-4 dark:divide-gray-700">
                <FilterSection title="品種" options={breedOptions} selected={draft.breeds} onChange={(breeds) => setDraft((d) => ({ ...d, breeds }))} />
                <FilterSection title="生産" options={breederOptions} selected={draft.breeders} onChange={(breeders) => setDraft((d) => ({ ...d, breeders }))} />
                <FilterSection title="所有者" options={ownerOptions} selected={draft.owners} onChange={(owners) => setDraft((d) => ({ ...d, owners }))} searchable />
                <FilterSection title="生年" options={foaledDecadeOptions} selected={draft.foaledDecades} onChange={(foaledDecades) => setDraft((d) => ({ ...d, foaledDecades }))} />
                <FilterSection title="輸入年" options={importedDecadeOptions} selected={draft.importedDecades} onChange={(importedDecades) => setDraft((d) => ({ ...d, importedDecades }))} />
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                <button type="button" onClick={handleReset} className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  リセット
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  適用する
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
