import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import siteMetadata from '../data/siteMetadata.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')

function escape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function walkMarkdown(dir, files = []) {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) walkMarkdown(fullPath, files)
    else if (entry.isFile() && /\.(mdx|md)$/.test(entry.name)) files.push(fullPath)
  }
  return files
}

function loadFamilyPosts() {
  const dir = path.join(root, 'data', 'family')
  return walkMarkdown(dir)
    .map((filePath) => {
      const { data } = matter(readFileSync(filePath, 'utf8'))
      const rel = path.relative(dir, filePath).replace(/\\/g, '/').replace(/\.(mdx|md)$/, '')
      return {
        path: `family/${rel}`,
        title: data.title || rel,
        summary: data.summary || '',
        date: data.date,
        draft: data.draft === true,
      }
    })
    .filter((post) => !post.draft && post.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

const generateRssItem = (config, post) => `
  <item>
    <guid>${config.siteUrl}/${post.path}</guid>
    <title>${escape(post.title)}</title>
    <link>${config.siteUrl}/${post.path}</link>
    ${post.summary ? `<description>${escape(post.summary)}</description>` : ''}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${config.author}</author>
  </item>
`

const generateRss = (config, posts, page = 'feed.xml') => `
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escape(config.title)}</title>
      <link>${config.siteUrl}</link>
      <description>${escape(config.description)}</description>
      <language>${config.language}</language>
      <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
      <atom:link href="${config.siteUrl}/${page}" rel="self" type="application/rss+xml"/>
      ${posts.map((post) => generateRssItem(config, post)).join('')}
    </channel>
  </rss>
`

async function generateRSS(config, posts) {
  if (posts.length === 0) return
  mkdirSync('./public', { recursive: true })
  writeFileSync('./public/feed.xml', generateRss(config, posts))
}

const rss = () => {
  generateRSS(siteMetadata, loadFamilyPosts())
  console.log('RSS feed generated...')
}
export default rss
