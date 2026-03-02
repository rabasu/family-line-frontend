import type { GlossaryTerm } from '@/types/GlossaryTerm'
import termsData from './terms.json'

const allTerms = (termsData as { terms: GlossaryTerm[] }).terms
const terms = allTerms.filter((t) => !t.draft)

let termMap: Map<string, GlossaryTerm> | null = null

function ensureTermMapInitialized(): Map<string, GlossaryTerm> {
  if (!termMap) {
    termMap = new Map<string, GlossaryTerm>()
    for (const term of terms) {
      termMap.set(term.slug, term)
      termMap.set(term.name, term)
      for (const alias of term.aliases ?? []) {
        termMap.set(alias, term)
      }
    }
  }
  return termMap
}

/**
 * slug / name / alias で用語を検索
 */
export function findGlossaryTerm(slugOrName: string): GlossaryTerm | undefined {
  return ensureTermMapInitialized().get(slugOrName)
}

/**
 * 全用語を取得（yomi でソート済み）
 */
export function getGlossaryTerms(): GlossaryTerm[] {
  return [...terms].sort((a, b) => a.yomi.localeCompare(b.yomi, 'ja'))
}

/**
 * 用語マップを取得（parseDescriptionSegments 等で使用）
 */
export function getGlossaryTermMap(): Map<string, GlossaryTerm> {
  return ensureTermMapInitialized()
}

/**
 * description 内の [[slug]] をパースしてセグメント配列を返す（クライアント安全）
 */
export function parseDescriptionSegments(description: string, termMap: Map<string, GlossaryTerm>): Array<{ type: 'text'; content: string } | { type: 'link'; slug: string; name: string }> {
  const segments: Array<{ type: 'text'; content: string } | { type: 'link'; slug: string; name: string }> = []
  const regex = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(description)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: description.slice(lastIndex, match.index) })
    }
    const key = match[1].trim()
    const term = termMap.get(key)
    if (term) {
      segments.push({ type: 'link', slug: term.slug, name: term.name })
    } else {
      segments.push({ type: 'text', content: match[0] })
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < description.length) {
    segments.push({ type: 'text', content: description.slice(lastIndex) })
  }

  return segments
}
