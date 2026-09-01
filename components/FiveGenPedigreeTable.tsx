import type { PedigreePathNode } from '@/types/Horse'
import { FIVE_GEN_DEPTH } from '@/types/FiveGenPedigree'
import { formatBreedMark } from '@/lib/breed-mark'
import { leafAncestryPaths, pathsStartingAtLeaf, rowspanForPath, sexFromPath } from '@/lib/sire-pedigree-paths'

const LEAVES = leafAncestryPaths(FIVE_GEN_DEPTH)
const HEADERS = ['父/母', '2代', '3代', '4代', '5代']

function cellMeta(node: PedigreePathNode | undefined): string {
  if (!node) return ''
  const parts: string[] = []
  if (node.foaled?.year != null) parts.push(String(node.foaled.year))
  if (node.color) parts.push(node.color)
  const breedMark = formatBreedMark(node.breed)
  if (breedMark) parts.push(breedMark)
  return parts.join(' ')
}

// 血統が判らない祖先に使われる表記。'【血統不明】' は牝系不明の馬をまとめる仮の牝祖
const UNKNOWN_NAMES = new Set(['不詳', '不明', '【血統不明】'])

function isUnknownName(name: string | undefined): boolean {
  return !name || UNKNOWN_NAMES.has(name)
}

function Cell({ node }: { node: PedigreePathNode | undefined }) {
  const name = node?.name?.trim()
  const unknown = isUnknownName(name)
  return (
    <div className="px-1.5 py-0.5">
      <div className={unknown ? 'pedi-name-unknown' : 'pedi-name'}>{name || '—'}</div>
      {!unknown && cellMeta(node) && <div className="pedi-meta">{cellMeta(node)}</div>}
    </div>
  )
}

/** 祖先が1頭も判っていない血統表は出す意味がない */
export function hasKnownAncestor(ancestryByPath: Partial<Record<string, PedigreePathNode>>): boolean {
  return Object.values(ancestryByPath).some((node) => !isUnknownName(node?.name?.trim()))
}

type Props = {
  ancestryByPath: Partial<Record<string, PedigreePathNode>>
}

export default function FiveGenPedigreeTable({ ancestryByPath }: Props) {
  return (
    <div className="overflow-auto">
      <table className="border-collapse text-left">
        <thead>
          <tr className="bg-stone-100 text-[11px] text-stone-600">
            {HEADERS.map((label) => (
              <th key={label} className="border border-stone-300 px-2 py-1 font-medium whitespace-nowrap">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LEAVES.map((leaf, leafIndex) => {
            const starting = pathsStartingAtLeaf(leaf, leafIndex, LEAVES, FIVE_GEN_DEPTH)
            return (
              <tr key={leaf}>
                {starting.map((path) => (
                  <td
                    key={path}
                    rowSpan={rowspanForPath(path, FIVE_GEN_DEPTH)}
                    className={`pedi-cell ${sexFromPath(path) === 'female' ? 'pedi-dam' : 'pedi-sire'}`}
                  >
                    <Cell node={ancestryByPath[path]} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
