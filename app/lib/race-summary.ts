import { grades } from '@/types/Grade'
import type { AggregatedRaceStats } from '@/types/AggregatedRaceStats'
import type RaceRecord from '@/types/RaceResult'
import { compareDate } from 'app/lib/utils'

/**
 * HorseCard のチップ用にレースを抽出する。
 * number 件を目安に、重賞勝利 → 重賞着順 → 平地勝利の順で優先する。
 */
export function filterHighlightRaces(records: RaceRecord[], number: number): RaceRecord[] {
  if (records.length === 0) {
    return records
  }
  const wonGradeRaces = records.filter(
    (record) => record.result === '1' && grades[record.grade].isJusho
  )
  if (wonGradeRaces.length >= number) {
    return wonGradeRaces.sort((a, b) => {
      if (a.grade !== b.grade) {
        return grades[a.grade].rank - grades[b.grade].rank
      }
      return compareDate(a.date, b.date)
    })
  }

  const allGradeRaces: RaceRecord[] = records
    .filter((record) => grades[record.grade].rank <= 6)
    .filter((record) => !Number.isNaN(Number(record.result)))
    .sort((a, b) => {
      if (Number(a.result) !== Number(b.result)) {
        return Number(a.result) - Number(b.result)
      }
      if (a.grade !== b.grade) {
        return grades[a.grade].rank - grades[b.grade].rank
      }
      return compareDate(a.date, b.date)
    })
    .slice(0, number)

  if (allGradeRaces.length < number) {
    const rest = number - allGradeRaces.length
    const restRaces = records.filter(
      (record) => record.result === '1' && grades[record.grade].rank > 6
    )
    return [...allGradeRaces, ...restRaces.slice(0, rest)]
  }
  return allGradeRaces
}

/** 重賞（isJusho）勝利が1つでもあれば true */
export function hasGradeWin(records: RaceRecord[] | undefined): boolean {
  return (records || []).some((record) => record.result === '1' && grades[record.grade].isJusho)
}

export function raceStatsSummary(raceStats: AggregatedRaceStats | undefined): string {
  if (!raceStats) {
    return ''
  }
  const { runs, wins } = raceStats.total
  // 「0戦0勝」や wins/runs 両方 null にはデータ不足が含まれるため、不出走ではなく空欄とする
  if ((runs == null && wins == null) || (runs === 0 && wins === 0)) {
    return ''
  }
  return `${runs ?? '?'}戦${wins ?? '?'}勝`
}
