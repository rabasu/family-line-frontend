'use client'

import Link from '@/components/Link'
import { getGlossaryTermMap, parseDescriptionSegments } from '@/data/glossary'
import type { GlossaryTerm } from '@/types/GlossaryTerm'

interface GlossaryTermCardProps {
  term: GlossaryTerm
}

export default function GlossaryTermCard({ term }: GlossaryTermCardProps) {
  const termMap = getGlossaryTermMap()
  const segments = parseDescriptionSegments(term.description, termMap)

  return (
    <article id={term.slug} className="scroll-mt-24 py-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{term.name}</h3>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        {segments.map((seg, i) =>
          seg.type === 'text' ? (
            <span key={i}>{seg.content}</span>
          ) : (
            <Link key={i} href={`/glossary#${seg.slug}`} className="text-primary-500 underline decoration-primary-500/30 underline-offset-2 hover:text-primary-600 dark:hover:text-primary-400">
              {seg.name}
            </Link>
          )
        )}
      </p>
    </article>
  )
}
