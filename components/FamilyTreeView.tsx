import { tv } from 'tailwind-variants'
import HorseCard from './HorseCard'
import type { Horse } from '@/types/Horse'
import { Foaled } from '@/types/Foaled'

const branch = tv({
  base: 'tree-branch',
  variants: {
    // 末子は肘の高さで縦線を止める。根には線を引かない。
    border: {
      last: 'tree-branch-last',
      default: '',
      root: 'tree-root',
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
    <div className={`${branch({ border })} scroll-mt-24`} id={id}>
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
    <div className="min-w-0 max-w-full overflow-x-auto">
      <div className="root min-w-max">
        <Branch key="root" id={horse.id} border="root" horse={horse} />
      </div>
    </div>
  )
}
