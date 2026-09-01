/**
 * 牝系図・血統表向けの品種注記。
 * サラ（および未設定）は既定なので無標。それ以外だけ短いラベルを返す。
 */
export function formatBreedMark(breed: string | undefined | null): string | null {
  if (!breed) return null
  const trimmed = breed.trim()
  if (!trimmed || trimmed === 'サラ') return null
  return trimmed
}
