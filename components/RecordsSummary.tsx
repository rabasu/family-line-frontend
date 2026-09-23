import { grades, type GradeCode } from '@/types/Grade'
import { raceGradeClass } from '@/lib/ui-theme'

export type RaceChipRecord = {
  displayRace: string
  grade: GradeCode
  result: string
  date?: Date | string | { year?: number; month?: number; day?: number }
}

function chipYear(date: RaceChipRecord['date']): number | string {
  if (!date) return '?'
  if (date instanceof Date) return date.getFullYear()
  if (typeof date === 'string') {
    const year = new Date(date).getFullYear()
    return Number.isNaN(year) ? '?' : year
  }
  return date.year ?? '?'
}

function RecordChip({ record }: { record: RaceChipRecord }) {
  const isWin = record.result === '1'
  return (
    <span className="race-chip inline-flex items-baseline gap-x-1.5 px-2 py-0.5">
      {!isWin && <span className="text-heading">{record.result}着</span>}
      <span className={`${raceGradeClass(grades[record.grade].rank)} ${isWin ? 'font-bold' : ''}`}>{record.displayRace}</span>
      <span className="text-heading">{chipYear(record.date)}</span>
    </span>
  )
}

export function RecordsSummary({ records }: { records: RaceChipRecord[] }) {
  if (records.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {records.map((record, i) => (
        <RecordChip key={`${i}-${record.displayRace}-${chipYear(record.date)}-${record.result}`} record={record} />
      ))}
    </div>
  )
}
