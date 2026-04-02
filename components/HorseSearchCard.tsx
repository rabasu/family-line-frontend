import Link from 'next/link'
import { HorseSearchEntry, RaceResultJSON } from '@/types/HorseSearchEntry'
import { grades } from '@/types/Grade'
import { AggregatedRaceStats } from '@/types/AggregatedRaceStats'
import { PrizeMoney } from '@/types/PrizeMoney'

/** name / pedigreeName の1行目 */
function mainName(entry: HorseSearchEntry): string {
  if (entry.name && entry.pedigreeName) return `${entry.name} / ${entry.pedigreeName}`
  return entry.name ?? entry.pedigreeName ?? ''
}

/** formerName / localName など2行目に並べる名前 */
function subNames(entry: HorseSearchEntry): string[] {
  const names: string[] = []
  if (entry.formerName) names.push(`［${entry.formerName}］`)
  if (entry.localName) names.push(`［${entry.localName}］`)
  if (entry.englishName) names.push(entry.englishName)
  return names
}

function raceStatsSummary(raceStats: AggregatedRaceStats | undefined): string {
  if (!raceStats) return ''
  const text = `${raceStats.total.runs ?? '?'}戦${raceStats.total.wins ?? '?'}勝`
  return text === '0戦0勝' ? '' : text
}

function prizeMoneySummary(prizeMoney: PrizeMoney | undefined): string {
  if (!prizeMoney) return ''
  if (prizeMoney.total === '0.0万円' || prizeMoney.total === '0万円') return ''
  return prizeMoney.total
}

function dateToYear(date: RaceResultJSON['date']): number {
  if (!date) return 0
  if (typeof date === 'string') return new Date(date).getFullYear()
  return date.year ?? 0
}

const getRaceStyle = (rank: number): string => {
  switch (rank) {
    case 1:
      return 'text-red-700'
    case 2:
      return 'text-blue-500'
    case 3:
      return 'text-green-600'
    case 5:
      return 'text-violet-600'
    default:
      return ''
  }
}

const RecordItem = ({ record }: { record: RaceResultJSON }) => {
  const rank = grades[record.grade].rank
  const year = dateToYear(record.date)
  return (
    <span className="inline-flex items-baseline">
      {record.result !== '1' && <span>（{record.result}着）</span>}
      <span className={`mr-1 ${getRaceStyle(rank)} ${record.result === '1' ? 'font-bold' : ''}`}>{record.displayRace}</span>
      <span className="text-sm">（{year}）</span>
    </span>
  )
}

const bgBySex: Record<string, string> = {
  male: 'bg-cyan-100 dark:bg-cyan-900/30',
  female: 'bg-red-50 dark:bg-red-900/20',
  gelding: 'bg-green-100 dark:bg-green-900/30',
}

interface Props {
  entry: HorseSearchEntry
}

export default function HorseSearchCard({ entry }: Props) {
  const statsSummary = raceStatsSummary(entry.raceStats)
  const prizeText = prizeMoneySummary(entry.prizeMoney)
  const sexBg = bgBySex[entry.sex] ?? 'bg-gray-50 dark:bg-gray-800'
  const sub = subNames(entry)

  return (
    <div className={`border-y border-gray-300 px-5 py-2 text-sm dark:border-gray-600 md:text-base ${sexBg}`}>
      {/* ─── 馬名 + 父母 ─── */}
      <div className="grid grid-cols-2 items-stretch">
        {/* 左: 馬名 + 生年 */}
        <div className="flex flex-col justify-center pr-3">
          <Link href={`/family/${entry.family}#${entry.id}`} className="font-bold hover:underline">
            {mainName(entry)}
          </Link>
          {sub.length > 0 && <div className="text-xs text-gray-500 dark:text-gray-400">{sub.join('　')}</div>}
          <div className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{entry.foaled.year ?? '?'}</div>
        </div>

        {/* 右: 父母（縦線・横線で分割） */}
        <div className="divide-y divide-gray-300 border-l border-gray-300 dark:divide-gray-600 dark:border-gray-600">
          <div className="py-0.5 pl-3 text-sm text-gray-600 dark:text-gray-400" title={entry.sire}>
            {entry.sire || '不詳'}
          </div>
          <div className="flex items-center justify-between gap-x-1 py-0.5 pl-3 pr-1">
            <span className="text-sm text-gray-400 dark:text-gray-500" title={entry.dam}>
              {entry.dam || '不詳'}
            </span>
            <Link
              href={`/family/${entry.family}`}
              className="shrink-0 rounded border border-primary-400 px-1.5 py-0.5 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:border-primary-500 dark:text-primary-400 dark:hover:bg-primary-900/20"
            >
              {entry.familyName}系
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 情報行: 戦績・賞金 ─── */}
      <div className="mt-1 border-t border-gray-300 pt-1 dark:border-gray-600">
        <div className="flex items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
          {statsSummary && <span className="shrink-0">{statsSummary}</span>}
          {prizeText && <span className="shrink-0">{prizeText}</span>}
        </div>

        {/* ─── 重賞成績（左詰め） ─── */}
        {entry.topRaceResults.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-sm">
            {entry.topRaceResults.map((record, i) => (
              <RecordItem key={`${i}-${record.displayRace}`} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
