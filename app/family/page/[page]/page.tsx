import ListLayout from '@/layouts/ListLayoutWithTags'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allFamilies } from 'contentlayer/generated'

const POSTS_PER_PAGE = 5

export const dynamicParams = false

export const generateStaticParams = async () => {
  const totalPages = Math.ceil(allFamilies.length / POSTS_PER_PAGE)
  return Array.from({ length: totalPages }, (_, i) => ({ page: (i + 1).toString() }))
}

export default function Page({ params }: { params: { page: string } }) {
  const posts = allCoreContent(sortPosts(allFamilies))
  const pageNumber = parseInt(params.page as string)
  const initialDisplayPosts = posts.slice(POSTS_PER_PAGE * (pageNumber - 1), POSTS_PER_PAGE * pageNumber)
  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  }

  return <ListLayout posts={posts} initialDisplayPosts={initialDisplayPosts} pagination={pagination} title="牝系一覧" />
}
