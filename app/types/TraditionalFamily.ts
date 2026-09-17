export interface TraditionalFamily {
  slug: string
  name: string
  /** 牝祖の血統名。あれば一覧の見出しに使う */
  pedigreeName?: string
  foaled?: string
  breeder?: string
  importedYear?: string
  owner?: string
  breed?: string
}

/** 牝系一覧の見出し。血統名があればそれを、なければ競走名 */
export function familyListName(family: Pick<TraditionalFamily, 'name' | 'pedigreeName'>): string {
  const pedigree = family.pedigreeName?.trim()
  if (pedigree) return pedigree
  return family.name
}
