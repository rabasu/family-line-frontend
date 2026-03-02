/**
 * 用語集の用語型定義
 */
export interface GlossaryTerm {
  slug: string
  name: string
  yomi: string
  description: string
  aliases?: string[]
  /** true の場合は用語集画面に表示せず、リンク化もしない */
  draft?: boolean
}

export interface GlossaryData {
  terms: GlossaryTerm[]
}
