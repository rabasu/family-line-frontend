'use client'

import { useState } from 'react'
import { ALL_BREEDS } from '@/types/Breed'
import {
  PedigreePathNodeInput,
  leafAncestryPaths,
  pathLabelJa,
  pathsStartingAtLeaf,
  rowspanForPath,
  sexFromPath,
} from '@/lib/sire-pedigree-paths'

const LEAVES = leafAncestryPaths(4)
const COLORS = ['', '栗毛', '鹿毛', '黒鹿毛', '青毛', '青鹿毛', '芦毛', '白毛', '栃栗毛']

export type CellFetchSite = 'pedigreequery' | 'allbreed'

type Props = {
  value: Record<string, PedigreePathNodeInput>
  onChange: (next: Record<string, PedigreePathNodeInput>) => void
  onFetchCell?: (path: string, site: CellFetchSite, id: string) => void
  fetchingPath?: string | null
  fetchDisabled?: boolean
}

function CellEditor({
  path,
  node,
  onChange,
  onFetchCell,
  fetchingPath,
  fetchDisabled,
}: {
  path: string
  node: PedigreePathNodeInput
  onChange: (next: PedigreePathNodeInput) => void
  onFetchCell?: (path: string, site: CellFetchSite, id: string) => void
  fetchingPath?: string | null
  fetchDisabled?: boolean
}) {
  const [onlineId, setOnlineId] = useState('')
  const rs = rowspanForPath(path)
  const busy = fetchingPath === path
  const id = onlineId.trim()
  const pqHref = id
    ? `https://www.pedigreequery.com/${id.replace(/ /g, '+')}`
    : ''
  const abHref = id
    ? `https://www.allbreedpedigree.com/${id.replace(/ /g, '+')}`
    : ''

  return (
    <td
      rowSpan={rs}
      className="border border-stone-400 bg-white p-1 align-top min-w-[10rem] max-w-[13rem]"
    >
      <div className="mb-0.5 text-[10px] text-stone-500">{pathLabelJa(path)}</div>
      <input
        className="mb-0.5 w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
        value={node.name}
        onChange={(e) => onChange({ ...node, name: e.target.value })}
      />
      <div className="flex gap-0.5">
        <input
          className="w-14 rounded border border-stone-300 px-1 py-0.5 text-[11px]"
          inputMode="numeric"
          value={node.foaledYear || ''}
          onChange={(e) => onChange({ ...node, foaledYear: e.target.value })}
        />
        <select
          className="min-w-0 flex-1 rounded border border-stone-300 px-0.5 py-0.5 text-[11px]"
          value={node.color || ''}
          onChange={(e) => onChange({ ...node, color: e.target.value })}
        >
          {COLORS.map((c) => (
            <option key={c || 'none'} value={c}>
              {c || '毛色'}
            </option>
          ))}
        </select>
      </div>
      <select
        className="mt-0.5 w-full rounded border border-stone-300 px-0.5 py-0.5 text-[11px]"
        value={node.breed || ''}
        onChange={(e) =>
          onChange({
            ...node,
            breed: (e.target.value || '') as PedigreePathNodeInput['breed'],
          })
        }
      >
        <option value="">品種</option>
        {ALL_BREEDS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <input
        className="mt-0.5 w-full rounded border border-stone-300 px-1 py-0.5 text-[10px] text-stone-600"
        value={node.netkeibaId || ''}
        onChange={(e) => onChange({ ...node, netkeibaId: e.target.value })}
      />
      <div className="mt-0.5 text-[10px] text-stone-400">
        {node.sex === 'female' ? '牝' : '牡'}
      </div>
      {onFetchCell && (
        <div className="mt-1 border-t border-stone-200 pt-1">
          <input
            className="mb-0.5 w-full rounded border border-stone-300 px-1 py-0.5 font-mono text-[10px]"
            value={onlineId}
            onChange={(e) => setOnlineId(e.target.value)}
          />
          <div className="flex gap-0.5">
            <button
              type="button"
              disabled={fetchDisabled || !id}
              className="flex-1 rounded border border-stone-400 px-1 py-0.5 text-[10px] disabled:opacity-40"
              onClick={() => onFetchCell(path, 'pedigreequery', id)}
            >
              {busy ? '…' : 'PQ'}
            </button>
            <button
              type="button"
              disabled={fetchDisabled || !id}
              className="flex-1 rounded border border-stone-400 px-1 py-0.5 text-[10px] disabled:opacity-40"
              onClick={() => onFetchCell(path, 'allbreed', id)}
            >
              {busy ? '…' : 'AB'}
            </button>
          </div>
          {id && (
            <div className="mt-0.5 flex gap-1.5 text-[10px]">
              <a
                className="text-sky-700 underline"
                href={pqHref}
                target="_blank"
                rel="noreferrer"
              >
                PQ
              </a>
              <a
                className="text-sky-700 underline"
                href={abHref}
                target="_blank"
                rel="noreferrer"
              >
                AB
              </a>
            </div>
          )}
        </div>
      )}
    </td>
  )
}

export default function BloodTableEditor({
  value,
  onChange,
  onFetchCell,
  fetchingPath,
  fetchDisabled,
}: Props) {
  const setPath = (path: string, node: PedigreePathNodeInput) => {
    onChange({
      ...value,
      [path]: {
        ...node,
        sex: node.sex || sexFromPath(path),
      },
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-left">
        <thead>
          <tr className="bg-stone-100 text-[11px] text-stone-600">
            <th className="border border-stone-400 px-2 py-1">父/母</th>
            <th className="border border-stone-400 px-2 py-1">2代</th>
            <th className="border border-stone-400 px-2 py-1">3代</th>
            <th className="border border-stone-400 px-2 py-1">4代</th>
          </tr>
        </thead>
        <tbody>
          {LEAVES.map((leaf, leafIndex) => {
            const starting = pathsStartingAtLeaf(leaf, leafIndex, LEAVES, 4)
            return (
              <tr key={leaf} className={leaf.startsWith('d') ? 'bg-rose-50/40' : 'bg-sky-50/40'}>
                {starting.map((path) => (
                  <CellEditor
                    key={path}
                    path={path}
                    node={
                      value[path] || {
                        name: '',
                        foaledYear: '',
                        color: '',
                        sex: sexFromPath(path),
                        breed: '',
                        netkeibaId: '',
                      }
                    }
                    onChange={(n) => setPath(path, n)}
                    onFetchCell={onFetchCell}
                    fetchingPath={fetchingPath}
                    fetchDisabled={fetchDisabled}
                  />
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
