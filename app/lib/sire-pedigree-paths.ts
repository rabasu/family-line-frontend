/** 種牡馬4代血統表（ancestryByPath）用のパスユーティリティ */

import type { Breed } from '@/types/Breed'

export const SIRE_PEDIGREE_DEPTH = 4
export const UNKNOWN_NAME = '不詳'

export type Sex = 'male' | 'female' | 'gelding'

export type PedigreePathNodeInput = {
  name: string
  foaledYear?: string
  color?: string
  sex?: Sex | ''
  breed?: Breed | ''
  netkeibaId?: string
}

/** s 優先の DFS で長さ 1〜depth の全パス */
export function allAncestryPaths(depth = SIRE_PEDIGREE_DEPTH): string[] {
  const paths: string[] = []
  const rec = (cur: string, d: number) => {
    if (d > 0) paths.push(cur)
    if (d === depth) return
    rec(`${cur}s`, d + 1)
    rec(`${cur}d`, d + 1)
  }
  rec('', 0)
  return paths
}

/** 最遠葉（長さ = depth）を表の上から下の順で */
export function leafAncestryPaths(depth = SIRE_PEDIGREE_DEPTH): string[] {
  return allAncestryPaths(depth).filter((p) => p.length === depth)
}

export function sexFromPath(path: string): Sex {
  if (!path) return 'male'
  return path[path.length - 1] === 'd' ? 'female' : 'male'
}

export function pathLabelJa(path: string): string {
  if (!path) return ''
  return [...path].map((c) => (c === 's' ? '父' : '母')).join('')
}

export function rowspanForPath(path: string, depth = SIRE_PEDIGREE_DEPTH): number {
  return 2 ** (depth - path.length)
}

/** この葉行で新規開始する祖先パス（短い順） */
export function pathsStartingAtLeaf(
  leaf: string,
  leafIndex: number,
  leaves: string[],
  depth = SIRE_PEDIGREE_DEPTH
): string[] {
  const starting: string[] = []
  for (let len = 1; len <= depth; len++) {
    const path = leaf.slice(0, len)
    const firstLeafIdx = leaves.findIndex((l) => l.startsWith(path))
    if (firstLeafIdx === leafIndex) starting.push(path)
  }
  return starting
}

export type FetchedAncestryNode = {
  name?: string
  sex?: Sex
  color?: string
  breed?: string
  foaledYear?: number | null
}

export type FetchedSubject = {
  name?: string
  englishName?: string
  color?: string
  breed?: string
  foaledYear?: number | null
  sex?: string
}

/**
 * 取得ページの本人＋祖先を、四代表の指定セル以降にずらす。
 * ページ本人 → `branch`（馬名・生年・毛色はヘッダから）。
 * その祖先は prefix を付け、depth を超えるパスは捨てる。
 */
export function shiftFetchedAncestryToBranch(
  branch: string,
  subject: FetchedSubject,
  ancestryByPath: Record<string, FetchedAncestryNode>,
  depth = SIRE_PEDIGREE_DEPTH
): Record<string, FetchedAncestryNode> {
  if (!branch || !/^[sd]+$/.test(branch) || branch.length > depth) {
    return {}
  }
  const out: Record<string, FetchedAncestryNode> = {}
  const name = (subject.englishName || subject.name || '').trim()
  const node: FetchedAncestryNode = {
    name,
    sex: sexFromPath(branch),
  }
  if (subject.color) node.color = subject.color
  if (subject.breed) node.breed = subject.breed
  if (subject.foaledYear != null) node.foaledYear = subject.foaledYear
  out[branch] = node

  for (const [path, anc] of Object.entries(ancestryByPath || {})) {
    if (!path) continue
    const next = `${branch}${path}`
    if (next.length > depth) continue
    out[next] = anc
  }
  return out
}

export function emptyNodeInput(path: string): PedigreePathNodeInput {
  return {
    name: '',
    foaledYear: '',
    color: '',
    sex: sexFromPath(path),
    breed: '',
    netkeibaId: '',
  }
}

export function nodeFromJson(
  path: string,
  node?: {
    name?: string
    foaled?: { year?: number | null }
    color?: string
    sex?: Sex
    breed?: Breed
    netkeibaId?: string
  } | null
): PedigreePathNodeInput {
  if (!node) return emptyNodeInput(path)
  return {
    name: node.name || '',
    foaledYear:
      node.foaled?.year != null && node.foaled.year !== undefined
        ? String(node.foaled.year)
        : '',
    color: node.color || '',
    sex: node.sex || sexFromPath(path),
    breed: node.breed || '',
    netkeibaId: node.netkeibaId || '',
  }
}

/**
 * 入力マップを ancestryByPath に変換。
 * fillUnknown=true（既定）: 空の name は UNKNOWN_NAME（不詳）で埋め、全パスを揃える。
 * fillUnknown=false（一時保存）: 名前があるパスだけ残し、空欄は出力しない。
 */
export function buildAncestryByPath(
  input: Record<string, PedigreePathNodeInput>,
  depth = SIRE_PEDIGREE_DEPTH,
  options?: { fillUnknown?: boolean }
): Record<
  string,
  {
    name: string
    foaled?: { year: number }
    color?: string
    sex: Sex
    breed?: Breed
    netkeibaId?: string
  }
> {
  const fillUnknown = options?.fillUnknown !== false
  const out: Record<
    string,
    {
      name: string
      foaled?: { year: number }
      color?: string
      sex: Sex
      breed?: Breed
      netkeibaId?: string
    }
  > = {}
  for (const path of allAncestryPaths(depth)) {
    const raw = input[path] || emptyNodeInput(path)
    const trimmedName = (raw.name || '').trim()
    if (!fillUnknown && !trimmedName) continue
    const name = trimmedName || UNKNOWN_NAME
    const sex = (raw.sex || sexFromPath(path)) as Sex
    const node: {
      name: string
      foaled?: { year: number }
      color?: string
      sex: Sex
      breed?: Breed
      netkeibaId?: string
    } = { name, sex }
    const yearStr = (raw.foaledYear || '').trim()
    if (yearStr) {
      const year = Number(yearStr)
      if (Number.isFinite(year)) node.foaled = { year }
    }
    const color = (raw.color || '').trim()
    if (color) node.color = color
    const breed = (raw.breed || '').trim() as Breed | ''
    if (breed) node.breed = breed
    const nk = (raw.netkeibaId || '').trim()
    if (nk) node.netkeibaId = nk
    out[path] = node
  }
  return out
}
