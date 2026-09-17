'use client'

import type { MouseEvent } from 'react'
import { horseHref } from '@/lib/horse-id'
import { openHorseModal } from './HorseDetailModal'

type Props = {
  horseId: string
  displayName: string
}

/**
 * 馬名。クローラと「新しいタブで開く」のために実体は <a href> で、
 * 通常の左クリックだけ横取りしてモーダルを開く。
 *
 * 牝系ページには数百の馬名が並ぶので、ここではダイアログを持たない。
 * モーダル本体はレイアウトに1つだけ置いてある。
 */
export default function HorseNameWithPedigree({ horseId, displayName }: Props) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // 修飾キー付きクリックや中クリックは、ブラウザ本来の挙動に任せる
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    openHorseModal(horseId, displayName)
  }

  return (
    <a
      href={horseHref(horseId)}
      onClick={handleClick}
      className="hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer font-bold text-heading hover:underline"
    >
      {displayName}
    </a>
  )
}
