import Link from 'next/link'
import { horseSearchHref, type SearchFacetKey } from '@/lib/horse-search'

const SAME_LABEL: Record<SearchFacetKey, string> = {
  sire: '同じ父',
  dam: '同じ母',
  family: 'この牝系',
  breeder: '同じ生産者',
  owner: '同じ所有',
  trainer: '同じ調教師',
}

type Props = {
  facet: SearchFacetKey
  value: string
  /** あるとき本体は children。横に「同じ父」などの検索リンクを置く */
  children?: React.ReactNode
}

export default function AttributeSearchLink({ facet, value, children }: Props) {
  const href = horseSearchHref({ [facet]: value })
  if (!children) {
    return (
      <Link href={href} className="link-inline" data-full-page>
        {value}
      </Link>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {children}
      <Link href={href} className="link-inline text-xs" data-full-page>
        {SAME_LABEL[facet]}
      </Link>
    </span>
  )
}
