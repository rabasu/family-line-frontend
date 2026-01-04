'use client'

import RaceResult from '@/types/RaceResult'
import { grades } from '@/types/Grade'
import { findHorseByIdOnDemand } from '@/pedigree/index'
import { useEffect, useState } from 'react'
import type { Horse } from '@/types/Horse'

interface RaceResultsTableProps {
  results?: RaceResult[]
  horseId?: string
}

// グレードに応じた色を返す
const getGradeStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return 'text-red-700 font-bold'
    case 2:
      return 'text-blue-500 font-semibold'
    case 3:
      return 'text-green-600 font-semibold'
    case 4:
      return 'text-violet-600'
    case 5:
      return 'text-amber-600'
    case 6:
      return 'text-gray-700'
    default:
      return 'text-gray-500'
  }
}

// 着順に応じたスタイルを返す
const getResultStyle = (result: string) => {
  switch (result) {
    case '1':
      return 'bg-yellow-100 font-bold text-yellow-800'
    case '2':
      return 'bg-gray-100 font-semibold text-gray-700'
    case '3':
      return 'bg-amber-50 font-semibold text-amber-700'
    default:
      return ''
  }
}

// 日付をフォーマット
const formatDate = (date: Date) => {
  const d = new Date(date)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

const RaceResultsTable = ({ results: propResults, horseId }: RaceResultsTableProps) => {
  const [results, setResults] = useState<RaceResult[] | undefined>(propResults)
  const [displayName, setDisplayName] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (horseId && !propResults) {
      const loadHorse = async () => {
        try {
          setLoading(true)
          const horse = await findHorseByIdOnDemand(horseId)
          if (horse) {
            setResults(horse.raceResults)
            setDisplayName(horse.name || horse.pedigreeName)
          } else {
            setError('馬が見つかりませんでした')
          }
        } catch (err) {
          console.error('RaceResultsTable: エラーが発生しました:', err)
          setError('戦績データの取得に失敗しました')
        } finally {
          setLoading(false)
        }
      }
      loadHorse()
    }
  }, [horseId, propResults])

  if (loading) {
    return (
      <div className="my-4">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="my-4">
        <p className="text-red-500">エラー: {error}</p>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="my-4">
        <p className="text-gray-500">戦績データがありません</p>
      </div>
    )
  }

  // 日付順にソート（新しい順）
  const sortedResults = [...results].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="my-6">
      {displayName && <h3 className="mb-3 text-lg font-bold">{displayName}の重賞成績</h3>}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left text-sm font-semibold">日付</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-sm font-semibold">レース名</th>
              <th className="border border-gray-200 px-3 py-2 text-center text-sm font-semibold">格付け</th>
              <th className="border border-gray-200 px-3 py-2 text-center text-sm font-semibold">着順</th>
              {results.some((r) => r.racecourse) && <th className="border border-gray-200 px-3 py-2 text-left text-sm font-semibold">競馬場</th>}
              {results.some((r) => r.distance) && <th className="border border-gray-200 px-3 py-2 text-center text-sm font-semibold">距離</th>}
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result, index) => {
              const grade = grades[result.grade]
              return (
                <tr key={`${result.date}-${result.race}-${index}`} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(result.date)}</td>
                  <td className="border border-gray-200 px-3 py-2 text-sm">
                    <span className={getGradeStyle(grade.rank)}>{result.displayRace}</span>
                  </td>
                  <td className={`border border-gray-200 px-3 py-2 text-center text-sm ${getGradeStyle(grade.rank)}`}>{grade.name}</td>
                  <td className={`border border-gray-200 px-3 py-2 text-center text-sm ${getResultStyle(result.result)}`}>{result.result}着</td>
                  {results.some((r) => r.racecourse) && <td className="border border-gray-200 px-3 py-2 text-sm">{result.racecourse || '-'}</td>}
                  {results.some((r) => r.distance) && <td className="border border-gray-200 px-3 py-2 text-center text-sm">{result.distance ? `${result.distance}m` : '-'}</td>}
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
