/**
 * 根馬の系統解説ローダ。
 * data/family 配下の Markdown / MDX を gray-matter で読む。
 *
 * 表・系統図はページ側のスロット。本文は HorseMarkdown（太字 → 馬リンク）。
 */
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const FAMILY_DIR = path.join(process.cwd(), 'data', 'family')

export type FamilyArticle = {
  slug: string
  title: string
  summary?: string
  draft: boolean
  markdown: string
}

/** 旧ブログ JSX の残骸を Markdown に落とす */
export function normalizeFamilyMarkdown(source: string): string {
  return source
    .replace(/<ProfileTable\b[^>]*\/?>/g, '')
    .replace(/<FamilyTree\b[^>]*\/?>/g, '')
    .replace(/<HL\s+name=['"]([^'"]+)['"]\s*\/>/g, '**$1**')
    .replace(/<(?:GlossaryLink|GL)\b[^>]*\/?>/g, '')
    .replace(/^\s*## 概要\s*\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function articleFromFile(slug: string, filePath: string): FamilyArticle {
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)

  return {
    slug,
    title: typeof data.title === 'string' ? data.title : '',
    summary: typeof data.summary === 'string' && data.summary.trim() ? data.summary : undefined,
    draft: data.draft === true,
    markdown: normalizeFamilyMarkdown(content),
  }
}

export function loadFamilyArticle(slug: string): FamilyArticle | null {
  const candidates = [path.join(FAMILY_DIR, `${slug}.mdx`), path.join(FAMILY_DIR, `${slug}.md`)]
  const filePath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!filePath) return null
  return articleFromFile(slug, filePath)
}

