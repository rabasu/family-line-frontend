import { horseSearchHref, type SearchFacetKey } from '@/lib/horse-search'

/** 横並びの検索リンク。牝系は系統名そのものが牝祖ページなので、ここには置かない */
type SideSearchFacet = Exclude<SearchFacetKey, 'family'>

const SAME_LABEL: Record<SideSearchFacet, string> = {
  sire: '同じ父',
  dam: '同じ母',
  breeder: '同じ生産者',
  owner: '同じ所有',
  trainer: '同じ調教師',
}

type Props = {
  facet: SideSearchFacet
  value: string
  /** あるとき本体は children。横に同じ属性で検索する虫眼鏡を置く */
  children?: React.ReactNode
}

export default function AttributeSearchLink({ facet, value, children }: Props) {
  const href = horseSearchHref({ [facet]: value })
  if (!children) {
    return (
      <a href={href} className="link-inline" data-full-page>
        {value}
      </a>
    )
  }
  const label = `${SAME_LABEL[facet]}で検索`
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      {children}
      <a href={href} className="link-inline inline-flex shrink-0 items-center rounded-sm p-0.5 !no-underline hover:!no-underline" data-full-page aria-label={label} title={label}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </a>
    </span>
  )
}
