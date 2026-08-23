import React from 'react'
import NextLink from 'next/link'
import { findHorseLinkByName } from 'app/lib/traditional-family-loader'

interface LinkProps {
  name: string
}

const HorseLink: React.FC<LinkProps> = ({ name }) => {
  const result = findHorseLinkByName(name)

  if (!result) {
    return <span className="font-medium">{name}</span>
  }

  // 個別ページが恒久URL。牝系内の位置は馬ページ側のパンくずから辿れる。
  return <NextLink href={`/horse/${result.link}`}>{result.name}</NextLink>
}

export default HorseLink
