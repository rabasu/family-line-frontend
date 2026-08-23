import { slug } from 'github-slugger'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import siteMetadata from '@/data/siteMetadata'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { allFamilies, allHorses } from 'contentlayer/generated'
import tagData from 'app/tag-data.json'
import { genPageMetadata } from 'app/seo'
import { Metadata } from 'next'

export const dynamicParams = false

function taggedPosts() {
  return [...allFamilies, ...allHorses]
}

export async function generateMetadata({ params }: { params: { tag: string } }): Promise<Metadata> {
  const tag = decodeURI(params.tag)
  return genPageMetadata({
    title: tag,
    description: `${siteMetadata.title} ${tag} tagged content`,
    alternates: {
      canonical: './',
    },
  })
}

export const generateStaticParams = async () => {
  const tagCounts = tagData as Record<string, number>
  return Object.keys(tagCounts).map((tag) => ({ tag: encodeURI(tag) }))
}

export default function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURI(params.tag)
  const filteredPosts = allCoreContent(
    sortPosts(taggedPosts().filter((post) => post.tags && post.tags.map((t) => slug(t)).includes(tag)))
  )
  return <ListLayout posts={filteredPosts} title={tag} />
}
