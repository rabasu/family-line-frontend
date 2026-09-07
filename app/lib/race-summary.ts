import { grades } from '@/types/Grade'
import type { AggregatedRaceStats } from '@/types/AggregatedRaceStats'
import type { PrizeMoney } from '@/types/PrizeMoney'
import type { RaceStats } from '@/types/RaceStats'
import type RaceRecord from '@/types/RaceResult'
import { compareDate } from 'app/lib/utils'

const DIVISION_LABEL: Record<string, string> = {
  central: '中央',
  local: '地方',
  abroad: '海外',
}

function isEmptyPrize(value?: string): boolean {
  return !value || value === '0万円' || value === '0.0万円'
}

function formatRunsWins(stats?: { runs?: number | null; wins?: number | null }): string | null {
  if (!stats) return null
  const { runs, wins } = stats
  if ((runs == null && wins == null) || (runs === 0 && wins === 0)) return null
  return `${runs ?? '?'}戦${wins ?? '?'}勝`
}

function isCategoryStats(stats: unknown): stats is { flat?: RaceStats; jump?: RaceStats } {
  return !!stats && typeof stats === 'object' && ('flat' in stats || 'jump' in stats)
}

/** 中央平地・中央障害・地方・海外など、値のある区分だけを並べる */
export function raceStatsDivisionDetails(raceStats: AggregatedRaceStats | undefined): string[] {
  if (!raceStats?.divisions?.length) return []
  const details: string[] = []
  for (const division of raceStats.divisions) {
    const typeLabel = DIVISION_LABEL[division.type] ?? division.type
    const stats = division.stats as unknown
    if (isCategoryStats(stats)) {
      const flat = formatRunsWins(stats.flat)
      const jump = formatRunsWins(stats.jump)
      if (flat) details.push(`${typeLabel}平地 ${flat}`)
      if (jump) details.push(`${typeLabel}障害 ${jump}`)
    } else {
      const all = formatRunsWins(stats as RaceStats)
      if (all) details.push(`${typeLabel} ${all}`)
    }
  }
  return details
}

/** 通算成績。区分データがあれば括弧書きで続ける */
export function formatRaceStatsDetailed(raceStats: AggregatedRaceStats | undefined): string {
  const total = formatRunsWins(raceStats?.total)
  if (!total) return ''
  const details = raceStatsDivisionDetails(raceStats)
  if (details.length === 0) return total
  return `${total}（${details.join(' / ')}）`
}

/** 獲得賞金。中央・地方・海外のうち2つ以上あれば内訳も続ける */
export function formatPrizeMoneyDetailed(prizeMoney: PrizeMoney | undefined): string {
  if (!prizeMoney || isEmptyPrize(prizeMoney.total)) return ''
  const parts: string[] = []
  if (!isEmptyPrize(prizeMoney.central) && prizeMoney.central) parts.push(`中央 ${prizeMoney.central}`)
  if (!isEmptyPrize(prizeMoney.local) && prizeMoney.local) parts.push(`地方 ${prizeMoney.local}`)
  if (!isEmptyPrize(prizeMoney.abroad) && prizeMoney.abroad) parts.push(`海外 ${prizeMoney.abroad}`)
  if (parts.length >= 2) return `${prizeMoney.total}（${parts.join(' / ')}）`
  return prizeMoney.total
}

export function hasRaceCareerInfo(
  raceStats: AggregatedRaceStats | undefined,
  prizeMoney: PrizeMoney | undefined,
  raceResultsLength: number
): boolean {
  return formatRaceStatsDetailed(raceStats) !== '' || formatPrizeMoneyDetailed(prizeMoney) !== '' || raceResultsLength > 0
}

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
