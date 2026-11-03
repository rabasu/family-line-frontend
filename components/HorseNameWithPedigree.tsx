'use client'

import type { MouseEvent } from 'react'
import { horseHref } from '@/lib/horse-id'
import { openHorseModal } from './HorseDetailModal'

type Props = {
  horseId: string
  displayName: string
  className?: string
  /** name: 一覧・図の見出し。inline: 本文中の参照 */
  tone?: 'name' | 'inline'
}

const TONE_CLASS = {
  name: 'cursor-pointer font-bold text-heading hover:text-primary-600 hover:underline dark:hover:text-primary-400',
  inline: 'link-inline',
} as const

/**
 * 馬個人へのリンク。実体は <a href="/{id}">。
 * 左クリックは共有モーダル、修飾キー・中クリック・新しいタブはブラウザのページ遷移。
 *
 * 牝系図には数百の馬名が並ぶので、ダイアログはここには持たない。
 * モーダル本体はレイアウトに1つだけ置いてある。
 */
export default function HorseNameWithPedigree({ horseId, displayName, className, tone = 'name' }: Props) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    openHorseModal(horseId, displayName)
  }

  return (
    <a href={horseHref(horseId)} onClick={handleClick} className={[TONE_CLASS[tone], className].filter(Boolean).join(' ')}>
      {displayName}
    </a>
  )
}
