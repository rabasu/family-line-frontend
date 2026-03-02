'use client'

import { useState, useMemo, useEffect } from 'react'
import GlossaryIndex, { getIndexKey } from '@/components/GlossaryIndex'
import GlossaryTermCard from '@/components/GlossaryTermCard'
import type { GlossaryTerm } from '@/types/GlossaryTerm'

interface GlossaryMainProps {
  terms: GlossaryTerm[]
}

function matchTerm(searchQuery: string, term: GlossaryTerm): boolean {
  const q = searchQuery.trim().toLowerCase()
  if (!q) return true
  const targets = [term.name, term.yomi, term.description, ...(term.aliases ?? [])]
  return targets.some((t) => t.toLowerCase().includes(q))
}

export default function GlossaryMain({ terms }: GlossaryMainProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTerms = useMemo(() => {
    return terms.filter((t) => matchTerm(searchQuery, t))
  }, [terms, searchQuery])

  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {}
    for (const term of filteredTerms) {
      const key = getIndexKey(term.yomi)
      if (!groups[key]) groups[key] = []
      groups[key].push(term)
    }
    const keys = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', '他']
    return keys.filter((k) => groups[k]?.length).map((k) => ({ key: k, terms: groups[k]! }))
  }, [filteredTerms])

  const activeKeys = useMemo(() => new Set(groupedTerms.map((g) => g.key)), [groupedTerms])

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
    if (hash) {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [])

  if (!terms.length) {
    return (
      <div className="min-w-0">
        <div className="space-y-2 pb-4 pt-6">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">用語集</h1>
        </div>
        <p className="py-12 text-center text-gray-500 dark:text-gray-400">現在整備中です。</p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <div className="space-y-2 pb-4 pt-6">
        <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">用語集</h1>
      </div>

      <div className="space-y-4 border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="relative">
          <label htmlFor="glossary-search" className="sr-only">
            用語を検索
          </label>
          <input
            id="glossary-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="用語で検索..."
            className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:max-w-md"
            aria-label="用語で検索"
          />
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>

        <GlossaryIndex activeKeys={activeKeys} />

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {filteredTerms.length}件{searchQuery.trim() && filteredTerms.length !== terms.length && ` / ${terms.length}件中`}
        </p>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {!filteredTerms.length && <p className="py-8 text-center text-gray-500 dark:text-gray-400">条件に一致する用語が見つかりません。</p>}
        {groupedTerms.map(({ key, terms: groupTerms }) => (
          <section key={key} id={`index-${key}`} className="scroll-mt-24">
            <h2 className="sticky top-0 z-10 bg-white py-2 text-base font-bold text-gray-700 dark:bg-gray-950 dark:text-gray-300">{key}</h2>
            <div className="space-y-0">
              {groupTerms.map((term) => (
                <GlossaryTermCard key={term.slug} term={term} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
