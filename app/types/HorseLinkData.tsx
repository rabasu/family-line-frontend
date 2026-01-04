/**
 * 軽量版の馬リンクデータ型
 * HorseDataから horse と dam を除いた軽量版
 */
interface HorseLinkData {
  name: string
  link: string
  family: string
  article?: boolean
}

export type { HorseLinkData }
