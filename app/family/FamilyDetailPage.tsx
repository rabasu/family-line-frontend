import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Comments from '@/components/Comments'
import FamilyTree from '@/components/FamilyTree'
import HorseMarkdown from '@/components/HorseMarkdown'
import ProfileTable from '@/components/ProfileTable'
import ScrollTopAndComment from '@/components/ScrollTopAndComment'
import siteMetadata from '@/data/siteMetadata'
import { loadFamilyArticle } from '@/lib/family-article'
import { loadFamilyByRootId } from '@/lib/traditional-family-loader'

export function familyPageMetadata(slug: string): Metadata | undefined {
  const article = loadFamilyArticle(slug)
  const rootId = article?.treeName || article?.horseId || slug.split('/').pop() || slug
  const family = loadFamilyByRootId(rootId)
  const title = article?.title || (family ? `${family.pedigreeName}系` : undefined)
  if (!title) return undefined

  const description = article?.summary || `${title}の基礎牝馬・解説・牝系図。`
  const url = `${siteMetadata.siteUrl}/family/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      siteName: siteMetadata.title,
      locale: 'ja_JP',
      type: 'article',
      url,
      images: [siteMetadata.socialBanner],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteMetadata.socialBanner],
    },
  }
}

export default function FamilyDetailPage({ slug }: { slug: string }) {
  const article = loadFamilyArticle(slug)
  if (article?.draft && process.env.NODE_ENV === 'production') {
    notFound()
  }

  const rootId = article?.treeName || slug.split('/').pop() || slug
  const family = loadFamilyByRootId(rootId)
  const horseId = article?.horseId || family?.rootHorseId
  const showTree = Boolean(family)
  const title = article?.title || (family ? `${family.pedigreeName}系` : undefined)

  if (!title) {
    notFound()
  }

  const description = article?.summary || `${title}の基礎牝馬・解説・牝系図。`
  const pageUrl = `${siteMetadata.siteUrl}/family/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: pageUrl,
    image: siteMetadata.socialBanner,
  }

  return (
    <div className="divide-y divide-stone-200 dark:divide-gray-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ScrollTopAndComment />
      <header className="space-y-2 pb-6 pt-6">
        <nav className="text-sm text-stone-500 dark:text-gray-400">
          <Link href="/" className="hover:underline">
            牝系一覧
          </Link>
        </nav>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-stone-900 dark:text-gray-100 sm:text-4xl">
          {title}
        </h1>
        {article?.summary && <p className="text-stone-500 dark:text-gray-400">{article.summary}</p>}
      </header>

      {horseId && (
        <section className="py-6">
          <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-gray-100">基礎牝馬</h2>
          <ProfileTable horseId={horseId} />
        </section>
      )}

      {article?.markdown && (
        <section className="max-w-none py-6">
          <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-gray-100">解説</h2>
          <HorseMarkdown markdown={article.markdown} />
        </section>
      )}

      {showTree && family && (
        <section className="py-6">
          <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-gray-100">牝系図</h2>
          <FamilyTree name={family.rootHorseId} />
        </section>
      )}

      {siteMetadata.comments?.provider && (
        <section className="py-6" id="comment">
          <Comments slug={slug} />
        </section>
      )}
    </div>
  )
}
