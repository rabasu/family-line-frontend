import type { PedigreePathNode } from '@/types/Horse'
import { FIVE_GEN_DEPTH } from '@/types/FiveGenPedigree'
import { leafAncestryPaths, pathsStartingAtLeaf, rowspanForPath, sexFromPath } from '@/lib/sire-pedigree-paths'

const LEAVES = leafAncestryPaths(FIVE_GEN_DEPTH)
const HEADERS = ['父/母', '2代', '3代', '4代', '5代']

function cellMeta(node: PedigreePathNode | undefined): string {
  if (!node) return ''
  const parts: string[] = []
  if (node.foaled?.year != null) parts.push(String(node.foaled.year))
  if (node.color) parts.push(node.color)
  return parts.join(' ')
}

function Cell({ node }: { node: PedigreePathNode | undefined }) {
  const name = node?.name?.trim()
  const unknown = !name || name === '不詳'
  return (
    <div className="px-1.5 py-0.5">
      <div className={`text-xs leading-tight ${unknown ? 'text-stone-400' : 'font-medium text-stone-800'}`}>
        {name || '—'}
      </div>
      {!unknown && cellMeta(node) && (
        <div className="text-[10px] leading-tight text-stone-500">{cellMeta(node)}</div>
      )}
    </div>
  )
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
                    className={`border border-stone-300 align-middle min-w-[7.5rem] max-w-[11rem] ${
                      sexFromPath(path) === 'female' ? 'bg-rose-50' : 'bg-sky-50'
                    }`}
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
