/* eslint-disable jsx-a11y/anchor-has-content */
import { AnchorHTMLAttributes } from 'react'

/**
 * サイト内リンク。静的書き出しの RSC .txt を辿らないよう、next/link は使わない。
 */
const CustomLink = ({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const url = typeof href === 'string' ? href : ''
  const isExternal = /^https?:\/\//.test(url)

  if (isExternal) {
    return <a target="_blank" rel="noopener noreferrer" href={href} {...rest} />
  }

  return <a href={href} {...rest} />
}

export default CustomLink
