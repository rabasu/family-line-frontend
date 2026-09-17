'use client'

import { useState, type ReactNode } from 'react'

type Props = {
  fullTree: ReactNode
  directTree: ReactNode
}

/**
 * 馬詳細向け。見出し・「産駒のみ表示」切替と、サーバー描画済みの牝系図スロット。
 * 樹本体は Server Component のまま渡し、クライアントには I/O を持ち込まない。
 */
export default function HorseFamilyTree({ fullTree, directTree }: Props) {
  const [directOnly, setDirectOnly] = useState(false)

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-xl font-bold text-heading">牝系図</h2>
        <label className="inline-flex cursor-pointer items-center gap-2 py-1 text-sm text-label select-none">
          <input
            type="checkbox"
            className="size-4 cursor-pointer rounded border-stone-300 text-sky-700 focus:ring-sky-600"
            checked={directOnly}
            onChange={(e) => setDirectOnly(e.target.checked)}
          />
          <span>産駒のみ表示</span>
        </label>
      </div>
      <div className={directOnly ? 'hidden' : undefined}>{fullTree}</div>
      <div className={directOnly ? undefined : 'hidden'}>{directTree}</div>
    </>
  )
}
