/**
 * トップページ用。牝祖の品種を4群に畳む。
 * JSON の breed はそのまま保持し、見せ方だけここで分ける。
 */
export type FamilyBreedGroup = 'サラ' | 'サラ系' | 'アラ・アア' | 'その他'

export const FAMILY_BREED_GROUPS: readonly FamilyBreedGroup[] = ['サラ', 'サラ系', 'アラ・アア', 'その他']

const ARAB_BREEDS = new Set(['アラ', 'アア', 'アラ系'])

export function familyBreedGroup(breed: string | undefined | null): FamilyBreedGroup {
  const trimmed = (breed ?? '').trim()
  if (trimmed === 'サラ') return 'サラ'
  if (trimmed === 'サラ系') return 'サラ系'
  if (ARAB_BREEDS.has(trimmed)) return 'アラ・アア'
  return 'その他'
}
