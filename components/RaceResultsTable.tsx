import RaceResult from '@/types/RaceResult'
import { grades } from '@/types/Grade'
import { findHorseById } from 'app/lib/traditional-family-loader'
import { raceGradeTableClass, resultPlaceClass } from '@/lib/ui-theme'

interface RaceResultsTableProps {
  results?: RaceResult[]
  horseId?: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** YYYY/MM/DD（月日はゼロ埋め）。年・月・日オブジェクトも受け取る */
const formatDate = (date: Date | string | { year: number; month: number; day: number }) => {
  if (date && typeof date === 'object' && 'year' in date && 'month' in date && 'day' in date) {
    return `${date.year}/${pad2(date.month)}/${pad2(date.day)}`
  }
  if (typeof date === 'string') {
    const iso = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (iso) return `${iso[1]}/${pad2(Number(iso[2]))}/${pad2(Number(iso[3]))}`
  }
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`
}

const formatFavorite = (favorite?: string | null) => {
  if (!favorite) return '-'
  return favorite.endsWith('人') ? favorite : `${favorite}人`
}

const RaceResultsTable = ({ results: propResults, horseId }: RaceResultsTableProps) => {
  let results = propResults
  let displayName: string | undefined

  if (!results && horseId) {
    const found = findHorseById(horseId)
    if (!found) {
      return (
        <div className="my-4">
          <p className="text-red-500">エラー: 馬が見つかりませんでした</p>
        </div>
      )
    }
    results = found.horse.raceResults
    displayName = found.horse.name || found.horse.pedigreeName
  }

  if (!results || results.length === 0) {
    return (
      <div className="my-4">
        <p className="text-muted">戦績データがありません</p>
      </div>
    )
  }

  const hasRacecourse = results.some((r) => r.racecourse)
  const hasDistance = results.some((r) => r.distance)

  // 日付順にソート（古い順）
  const sortedResults = [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div>
      {displayName && <h3 className="mb-3 text-lg font-bold text-heading">{displayName}の重賞成績</h3>}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-theme">
          <thead>
            <tr className="bg-thead">
              <th className="border border-theme px-3 py-2 text-left text-sm font-semibold">日付</th>
              <th className="border border-theme px-3 py-2 text-left text-sm font-semibold">レース名</th>
              <th className="border border-theme px-3 py-2 text-center text-sm font-semibold">格付け</th>
              <th className="border border-theme px-3 py-2 text-center text-sm font-semibold">着順</th>
              <th className="border border-theme px-3 py-2 text-center text-sm font-semibold">人気</th>
              {hasRacecourse && <th className="border border-theme px-3 py-2 text-left text-sm font-semibold">競馬場</th>}
              {hasDistance && <th className="border border-theme px-3 py-2 text-center text-sm font-semibold">距離</th>}
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result, index) => {
              const grade = grades[result.grade]
              return (
                <tr key={`${result.date}-${result.race}-${index}`} className="bg-hover-row">
                  <td className="border border-theme px-3 py-2 text-sm">{formatDate(result.date)}</td>
                  <td className="border border-theme px-3 py-2 text-sm">
                    <span className={raceGradeTableClass(grade.rank)}>{result.displayRace}</span>
                  </td>
                  <td className={`border border-theme px-3 py-2 text-center text-sm ${raceGradeTableClass(grade.rank)}`}>{grade.name}</td>
                  <td className={`border border-theme px-3 py-2 text-center text-sm ${resultPlaceClass(result.result)}`}>{result.result}着</td>
                  <td className="border border-theme px-3 py-2 text-center text-sm">{formatFavorite(result.favorite)}</td>
                  {hasRacecourse && <td className="border border-theme px-3 py-2 text-sm">{result.racecourse || '-'}</td>}
                  {hasDistance && <td className="border border-theme px-3 py-2 text-center text-sm">{result.distance ? `${result.distance}m` : '-'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RaceResultsTable
