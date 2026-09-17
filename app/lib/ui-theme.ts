import type { Sex } from '@/types/Horse'

/** 牝系図・検索・産駒行の性別背景。色は css/tailwind.css の変数がテーマに追従する */
export const sexBgClass: Record<Sex, string> = {
  male: 'sex-bg-male',
  female: 'sex-bg-female',
  gelding: 'sex-bg-gelding',
}

export function sexBg(sex: string | undefined): string {
  if (sex === 'male' || sex === 'female' || sex === 'gelding') return sexBgClass[sex]
  return 'sex-bg-unknown'
}

/**
 * レース格付けの文字色。空文字を返すと親の色を継ぎ、ダークモードで消えるので
 * 必ずクラスを返す。
 */
export function raceGradeClass(rank: number): string {
  switch (rank) {
    case 1:
      return 'race-grade-1'
    case 2:
      return 'race-grade-2'
    case 3:
      return 'race-grade-3'
    case 4:
    case 5:
      return 'race-grade-listed'
    default:
      return 'race-grade-plain'
  }
}

export function raceGradeTableClass(rank: number): string {
  if (rank === 1) return 'race-grade-1 font-bold'
  if (rank === 2) return 'race-grade-2 font-semibold'
  if (rank === 3) return 'race-grade-3 font-semibold'
  if (rank === 4) return 'race-grade-listed'
  if (rank === 5) return 'race-grade-historic'
  return 'race-grade-plain'
}

export function resultPlaceClass(result: string): string {
  switch (result) {
    case '1':
      return 'result-place-1 font-bold'
    case '2':
      return 'result-place-2 font-semibold'
    case '3':
      return 'result-place-3 font-semibold'
    default:
      return ''
  }
}
