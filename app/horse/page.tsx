import ListLayout from '@/layouts/FamilyListLayoutWithTags'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allHorses } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
import type { Horse } from 'contentlayer/generated'
import type { CoreContent } from 'pliny/utils/contentlayer'

const POSTS_PER_PAGE = 5

export const metadata = genPageMetadata({ title: '競走馬一覧' })

export default function HorsePage() {
  const posts = allCoreContent(sortPosts(allHorses)) as CoreContent<Horse>[]
  const pageNumber = 1
  const initialDisplayPosts = posts.slice(POSTS_PER_PAGE * (pageNumber - 1), POSTS_PER_PAGE * pageNumber)
  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  }

  return <ListLayout posts={posts} initialDisplayPosts={initialDisplayPosts} pagination={pagination} title="All Posts" />
}
