/**
 * 牝系ページ用の解説文ローダ。
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

function walkContentFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkContentFiles(fullPath, files)
    } else if (entry.isFile() && /\.(mdx|md)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
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

/** data/family 配下の slug（拡張子なし、入れ子パスあり） */
export function listFamilyArticleSlugs(): string[] {
  return walkContentFiles(FAMILY_DIR).map((filePath) => {
    const rel = path.relative(FAMILY_DIR, filePath).replace(/\\/g, '/')
    return rel.replace(/\.(mdx|md)$/, '')
  })
}

/**
 * 静的生成する牝系ページの slug。
 * 解説 MDX と在来牝系インデックスの和集合。draft は本番で除外する。
 */
export function listFamilyPageSlugs(): string[] {
  const slugs = new Set<string>()
  const isProd = process.env.NODE_ENV === 'production'

  for (const slug of listFamilyArticleSlugs()) {
    const article = loadFamilyArticle(slug)
    if (isProd && article?.draft) continue
    slugs.add(slug)
  }

  const indexPath = path.join(process.cwd(), 'data', 'pedigree', 'traditional-family-index.json')
  if (fs.existsSync(indexPath)) {
    const { families } = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as { families: { slug: string }[] }
    for (const family of families) slugs.add(family.slug)
  }

  return [...slugs]
}
