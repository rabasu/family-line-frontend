import { readFileSync } from 'fs'
import path from 'path'
import type { GlossaryTerm, GlossaryData } from '@/types/GlossaryTerm'

/**
 * 用語集JSONを読み込む（サーバー用）
 */
export function loadGlossaryTerms(): GlossaryTerm[] {
  const filePath = path.join(process.cwd(), 'data', 'glossary', 'terms.json')
  const content = readFileSync(filePath, 'utf8')
  const { terms } = JSON.parse(content) as GlossaryData
  return terms.filter((t) => !t.draft)
}

/**
 * slug / name / alias から用語を引くためのマップを構築
 */
export function getGlossaryTermMap(terms: GlossaryTerm[]): Map<string, GlossaryTerm> {
  const map = new Map<string, GlossaryTerm>()
  for (const term of terms) {
    map.set(term.slug, term)
    map.set(term.name, term)
    for (const alias of term.aliases ?? []) {
      map.set(alias, term)
    }
  }
  return map
}

/**
 * slug または name または alias で用語を検索
 */
export function findGlossaryTerm(termMap: Map<string, GlossaryTerm>, slugOrName: string): GlossaryTerm | undefined {
  return termMap.get(slugOrName)
}
