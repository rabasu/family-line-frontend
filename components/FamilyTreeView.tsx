import { tv } from 'tailwind-variants'
import HorseCard from './HorseCard'
import type { Horse } from '@/types/Horse'
import { Foaled } from '@/types/Foaled'

const branch = tv({
  base: 'ml-4',
  variants: {
    // 牝系図の線を制御
    border: {
      last: 'border-none [&>.horse-card]:border-l-4 [&>.horse-card]:border-indigo-500 [&>.horse-card]:border-double',
      default: 'border-l-4 border-indigo-500 border-double',
      root: '',
    },
  },
})

function Branch({
  horse,
  id,
  border,
}: {
  horse: Horse
  id: string
  border: 'last' | 'default' | 'root'
}) {
  const children = horse.children ? horse.children.toSorted((a, b) => Foaled.compare(a.foaled, b.foaled)) : []
  return (
    <div className={branch({ border })} id={id}>
      {HorseCard(horse)}
      {children.map((child: Horse, index: number) => (
        <Branch
          horse={child}
          key={`${child.id}`}
          id={`${child.id}`}
          border={index === children.length - 1 ? 'last' : 'default'}
        />
      ))}
    </div>
  )
}

/** 渡された馬を根にした牝系図（データ取得は呼び出し側） */
export default function FamilyTreeView({ horse }: { horse: Horse }) {
  return (
    <div className="w-full overflow-x-auto md:overflow-x-visible">
      <div className="root min-w-max">
        <Branch key="root" id="root" border="root" horse={horse} />
      </div>
    </div>
  )
}
