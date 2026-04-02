import { Metadata } from 'next'
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

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 xl:max-w-5xl xl:px-0">
      <div className="space-y-2 pb-4 pt-6 md:space-y-5">
        <h1 className="text-2xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl sm:leading-10 md:text-4xl md:leading-14">馬検索</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">牝系に登録された馬を横断検索します。馬名（競走名・血統名・旧名・英語名など）で検索できます。</p>
      </div>
      <HorseSearchClient data={searchIndex as HorseSearchEntry[]} />
    </div>
  )
}
