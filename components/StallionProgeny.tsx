'use client'

import { useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  gradeWinnerCount: number
  totalCount: number
}

/**
 * 馬詳細向け。見出し・「すべて表示」切替と、サーバー描画済みの産駒リスト。
 * 既定は重賞勝ち馬のみ。カード本体は Server Component のまま渡し、クライアントには I/O を持ち込まない。
 */
export default function StallionProgeny({ children, gradeWinnerCount, totalCount }: Props) {
  const [showAll, setShowAll] = useState(false)

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-xl font-bold text-heading">主な種牡馬成績</h2>
          <p className="mt-0.5 text-sm text-muted">
            重賞勝ち馬 {gradeWinnerCount}頭 / 登録産駒 {totalCount}頭
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 py-1 text-sm text-label select-none">
          <input
            type="checkbox"
            className="size-4 cursor-pointer rounded border-stone-300 text-sky-700 focus:ring-sky-600"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          <span>すべて表示</span>
        </label>
      </div>
      {gradeWinnerCount === 0 && !showAll && (
        <p className="mb-3 text-sm text-muted">重賞勝ち馬は登録されていません</p>
      )}
      <div className={`space-y-1 ${showAll ? '' : '[&_[data-grade-win=false]]:hidden'}`}>{children}</div>
    </>
  )
}
