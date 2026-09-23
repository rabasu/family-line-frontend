import { Metadata } from 'next'
import { Suspense } from 'react'
import siteMetadata from '@/data/siteMetadata'
import HorseSearchClient from '@/components/HorseSearchClient'
import searchIndex from '@/data/pedigree/horse-search-index.json'
import { HorseSearchEntry } from '@/types/HorseSearchEntry'

export const metadata: Metadata = {
  title: '馬検索',
  description: '牝系に登録された馬を横断検索します。',
  openGraph: {
    title: '馬検索',
    description: '牝系に登録された馬を横断検索します。',
    url: './',
    siteName: siteMetadata.title,
    locale: 'ja_JP',
    type: 'website',
  },
}

function SearchFallback() {
  return <p className="py-8 text-center text-sm text-muted">読み込んでるよ…</p>
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 xl:max-w-5xl xl:px-0">
      <div className="space-y-2 pb-4 pt-6 md:space-y-5">
        <h1 className="text-2xl font-extrabold leading-9 tracking-tight text-heading sm:text-3xl sm:leading-10 md:text-4xl md:leading-14">馬検索</h1>
        <p className="text-sm text-muted">
          牝系に登録された馬を横断検索します。馬名のほか、父・母・牝系・生産者・所有・調教師でも絞り込めます。条件は URL に残るので共有できます。
        </p>
      </div>
      <Suspense fallback={<SearchFallback />}>
        <HorseSearchClient data={searchIndex as HorseSearchEntry[]} />
      </Suspense>
    </div>
  )
}
