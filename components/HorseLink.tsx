import React from 'react'
import NextLink from 'next/link'
import { findHorseLinkByName, getHorsePageIndex } from 'app/lib/traditional-family-loader'

interface LinkProps {
  name: string
  /** 在来牝系の馬 id。horse-page-index にあれば名前引きより優先 */
  horseId?: string
  /** 表示名。省略時はマップの name（従来どおり） */
  displayName?: string
  /** 同名馬の linkName（馬名(YYYY)）を試す */
  year?: number
  /** 見つからないときの開発警告を出さない */
  quiet?: boolean
}

const HorseLink: React.FC<LinkProps> = ({ name, horseId, displayName, year, quiet }) => {
  const publishedId = horseId && getHorsePageIndex().horses[horseId] ? horseId : undefined
  const result = publishedId
    ? { link: publishedId, name }
    : findHorseLinkByName(name, { quiet, year })
  const label = displayName ?? result?.name ?? name

  if (!result) {
    return <span className="font-medium">{label}</span>
  }

  // 個別ページが恒久URL。牝系内の位置は馬ページ側のパンくずから辿れる。
  return <NextLink href={`/horse/${result.link}`}>{label}</NextLink>
}

export default HorseLink
