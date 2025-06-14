import { sortPosts, allCoreContent } from 'pliny/utils/contentlayer'
import { allBlogs, allFamilies } from 'contentlayer/generated'
import Main from './Main'

export default async function Page() {
  const sortedPosts = sortPosts(allFamilies)
  const posts = allCoreContent(sortedPosts)
  return <Main posts={posts} />
}
