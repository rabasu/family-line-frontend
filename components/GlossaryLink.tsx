'use client'

import Link from '@/components/Link'
import { findGlossaryTerm } from '@/data/glossary'

interface GlossaryLinkProps {
  /** 表示名またはエイリアスで検索 */
  term?: string
  /** 直接 slug を指定 */
  slug?: string
}

/**
 * 用語集へのリンク。MDX では <GL term="軽半" /> または <GlossaryLink slug="keihans" /> で使用
 */
export default function GlossaryLink({ term, slug }: GlossaryLinkProps) {
  let targetSlug: string | undefined
  let displayName: string | undefined

  if (slug) {
    const found = findGlossaryTerm(slug)
    if (found) {
      targetSlug = found.slug
      displayName = found.name
    }
  } else if (term) {
    const found = findGlossaryTerm(term)
    if (found) {
      targetSlug = found.slug
      displayName = found.name
    }
  }

  if (!targetSlug || !displayName) {
    return <span className="font-medium">{term ?? slug ?? ''}</span>
  }

  return (
    <Link href={`/glossary#${targetSlug}`} className="text-primary-500 underline decoration-primary-500/30 underline-offset-2 hover:text-primary-600 dark:hover:text-primary-400">
      {displayName}
    </Link>
  )
}
