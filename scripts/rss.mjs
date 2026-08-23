import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { slug } from 'github-slugger'
import { escape } from 'pliny/utils/htmlEscaper.js'
import siteMetadata from '../data/siteMetadata.js'
import { sortPosts } from 'pliny/utils/contentlayer.js'

// Node.js 22+ では import assert 構文がサポートされないため、
// JSON ファイルを fs で直接読み込む
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')

const tagData = JSON.parse(readFileSync(path.join(root, 'app/tag-data.json'), 'utf-8'))

// 該当する mdx が無い場合 contentlayer は _index.json を生成しない
const readIndex = (type) => {
  const indexPath = path.join(root, `.contentlayer/generated/${type}/_index.json`)
  return existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf-8')) : []
}

const generateRssItem = (config, post) => `
  <item>
    <guid>${config.siteUrl}/${post.path}</guid>
    <title>${escape(post.title)}</title>
    <link>${config.siteUrl}/${post.path}</link>
    ${post.summary && `<description>${escape(post.summary)}</description>`}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${config.email} (${config.author})</author>
    ${post.tags && post.tags.map((t) => `<category>${t}</category>`).join('')}
  </item>
`

const generateRss = (config, posts, page = 'feed.xml') => `
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escape(config.title)}</title>
      <link>${config.siteUrl}</link>
      <description>${escape(config.description)}</description>
      <language>${config.language}</language>
      <managingEditor>${config.email} (${config.author})</managingEditor>
      <webMaster>${config.email} (${config.author})</webMaster>
      <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
      <atom:link href="${config.siteUrl}/${page}" rel="self" type="application/rss+xml"/>
      ${posts.map((post) => generateRssItem(config, post)).join('')}
    </channel>
  </rss>
`

async function generateRSS(config, allPosts, page = 'feed.xml') {
  const publishPosts = allPosts.filter((post) => post.draft !== true)
  if (publishPosts.length === 0) return

  writeFileSync(`./public/${page}`, generateRss(config, sortPosts(publishPosts)))

  for (const tag of Object.keys(tagData)) {
    const filteredPosts = publishPosts.filter((post) => (post.tags || []).map((t) => slug(t)).includes(tag))
    if (filteredPosts.length === 0) continue
    const rssPath = path.join('public', 'tags', tag)
    mkdirSync(rssPath, { recursive: true })
    writeFileSync(path.join(rssPath, page), generateRss(config, sortPosts(filteredPosts), `tags/${tag}/${page}`))
  }
}

const rss = () => {
  generateRSS(siteMetadata, [...readIndex('Family'), ...readIndex('Horse')])
  console.log('RSS feed generated...')
}
export default rss
