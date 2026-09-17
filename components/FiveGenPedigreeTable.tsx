import type { PedigreePathNode } from '@/types/Horse'
import { FIVE_GEN_DEPTH } from '@/types/FiveGenPedigree'
import { formatBreedMark } from '@/lib/breed-mark'
import { isUnknownHorseName } from '@/lib/origin-country'
import { leafAncestryPaths, pathsStartingAtLeaf, rowspanForPath, sexFromPath } from '@/lib/sire-pedigree-paths'
import HorseLink from '@/components/HorseLink'

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

function isUnknownName(name: string | undefined): boolean {
  return isUnknownHorseName(name)
}

function CellName({ node, unknown }: { node: PedigreePathNode | undefined; unknown: boolean }) {
  const name = node?.name?.trim() || '—'
  if (unknown) return <>{name}</>
  return (
    <HorseLink name={name} horseId={node?.id} displayName={name} year={node?.foaled?.year} quiet />
  )
}

function Cell({ node, inlineMeta }: { node: PedigreePathNode | undefined; inlineMeta?: boolean }) {
  const name = node?.name?.trim()
  const unknown = isUnknownName(name)
  const meta = !unknown ? cellMeta(node) : ''
  const nameClass = unknown ? 'pedi-name-unknown' : 'pedi-name'
  return (
    <div className="px-1.5 py-0.5">
      {inlineMeta ? (
        <div className={`${nameClass} whitespace-nowrap`}>
          <CellName node={node} unknown={unknown} />
          {meta ? <span className="pedi-meta"> {meta}</span> : null}
        </div>
      ) : (
        <>
          <div className={nameClass}>
            <CellName node={node} unknown={unknown} />
          </div>
          {meta ? <div className="pedi-meta">{meta}</div> : null}
        </>
      )}
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
          <tr className="bg-thead text-[11px] text-label">
            {HEADERS.map((label) => (
              <th key={label} className="border border-theme px-2 py-1 font-medium whitespace-nowrap">
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
                    className={[
                      'pedi-cell',
                      path.length === FIVE_GEN_DEPTH ? 'pedi-cell-leaf' : '',
                      sexFromPath(path) === 'female' ? 'pedi-dam' : 'pedi-sire',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <Cell node={ancestryByPath[path]} inlineMeta={path.length === FIVE_GEN_DEPTH} />
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
