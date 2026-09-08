/**
 * 馬の解説記事（data/horse）。牝系記事と同じ Markdown 規約。
 */
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { normalizeFamilyMarkdown } from './family-article'

const HORSE_DIR = path.join(process.cwd(), 'data', 'horse')

export type HorseArticle = {
  slug: string
  summary?: string
  draft: boolean
  markdown: string
}

export function loadHorseArticle(slug: string): HorseArticle | null {
  const candidates = [path.join(HORSE_DIR, `${slug}.mdx`), path.join(HORSE_DIR, `${slug}.md`)]
  const filePath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!filePath) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  if (data.draft === true && process.env.NODE_ENV === 'production') return null

  return {
    slug,
    summary: typeof data.summary === 'string' && data.summary.trim() ? data.summary : undefined,
    draft: data.draft === true,
    markdown: normalizeFamilyMarkdown(content),
  }
}
