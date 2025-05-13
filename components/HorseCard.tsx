import { tv } from 'tailwind-variants'
import { Horse } from '@/types/Horse'
import { sex as sexes } from '@/types/Horse'
import { Grade, GradeCode, grades } from '@/types/Grade'
import { AggregatedRaceStats } from '@/types/AggregatedRaceStats'
import RaceRecord from '@/types/RaceResult'
import { yearOf, compareDate } from 'app/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import HorseLink from './HorseLink'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

const summary = tv({
  base: 'px-5 py-1',
  variants: {
    sex: {
      male: 'bg-cyan-100',
      female: 'bg-red-50',
      gelding: 'bg-green-100',
    },
  },
})

type RecordsProp = {
  records: RaceRecord[]
}

// 詳細非表示時に表示するレース項目を抽出する
// recordsからnumber件のレースを抽出
const filterRecords = (records: RaceRecord[], number: number) => {
  if (records.length == 0) {
    return records
  }
  // 重賞勝利を抽出
  const won_grade_races = records.filter(
    (record) => record.result === '1' && grades[record.grade].isJusho
  )
  // 重賞勝利数が{number}以上の場合、グレード→日付 の条件でソートし、重賞勝利のみを返す
  if (won_grade_races.length >= number) {
    return won_grade_races.sort((a, b) => {
      if (a.grade != b.grade) {
        return grades[a.grade].rank - grades[b.grade].rank
      } else {
        return compareDate(a.date, b.date)
      }
    })
  }

  // 重賞勝利数が{number}未満の場合、重賞成績を抽出 重賞はrank=6以下
  // 着順→グレード→日付 の条件でソートし、上位{number}レースを抽出
  const all_grade_races: RaceRecord[] = records
    .filter((record) => grades[record.grade].rank <= 6)
    .filter((record) => !Number.isNaN(record.result))
    .sort((a, b) => {
      if (Number(a.result) != Number(b.result)) {
        return Number(a.result) - Number(b.result)
      } else if (a.grade != b.grade) {
        return grades[a.grade].rank - grades[b.grade].rank
      } else {
        return compareDate(a.date, b.date)
      }
    })
    .slice(0, number)

  // 重賞成績が{number}未満の場合、{number}件になるまで重賞以外の勝利も追加する
  if (all_grade_races.length < number) {
    const rest = number - all_grade_races.length
    const rest_races = records.filter(
      (record) => record.result === '1' && grades[record.grade].rank > 6
    )
    return [...all_grade_races, ...rest_races.slice(0, rest)]
  } else {
    return all_grade_races
  }
}

const BaseInfo = (horse: Horse): JSX.Element => {
  return (
    <>
      <span className="font-bold">{displayHorseName(horse)}</span>{' '}
      <span className="text-sm">
        （{horse.foaled.year} by
        <HorseLink name={horse.sire} />）
      </span>{' '}
      {raceStatsSummary(horse.raceStats)} {horse.earnings}
    </>
  )
}

function raceStatsSummary(raceStats: AggregatedRaceStats | undefined) {
  const summary = raceStats ? `${raceStats.total.runs}戦${raceStats.total.wins}勝` : ''
  return summary
}

function HorseCard(horse: Horse) {
  const won_races: RaceRecord[] | undefined = horse.raceResults?.filter(
    (record) => record.result === '1'
  )
  // 勝ち鞍の最高格付け 重賞勝ち鞍がない場合は0
  const horse_rank = won_races
    ? Math.max(...won_races.map((record) => grades[record.grade].rank))
    : 0
  return (
    <div className="horse-card">
      <div className="-ml-2 pt-3 ">
        <div className="before:display-block card rounded-none bg-base-100 shadow-xl before:absolute before:z-10 before:mt-2 before:h-4 before:w-4 before:bg-white before:opacity-50 before:content-['']">
          <HorseDetails {...horse} />
        </div>
      </div>
    </div>
  )
}

export default HorseCard

const HorseDetails = (horse: Horse) => {
  const summarized = filterRecords(horse.raceResults || [], 3)
  if (horse.details) {
    return (
      <div className="">
        <details className="collapse collapse-arrow rounded-none ">
          <summary className={`collapse-title ${summary({ sex: horse.sex })} `}>
            <BaseInfo {...horse} />
            {summarized && <br />}
            {summarized && <RecordsSummary records={summarized} />}
          </summary>
          <div className="collapse-content rounded-none">
            {typeof horse.details === 'string' && (
              <ReactMarkdown
                remarkPlugins={[remarkBreaks, remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  p: ({ children }) => (
                    <p className="indent-4" style={{ marginBottom: '1em' }}>
                      {children}
                    </p>
                  ),
                  strong: ({ node, ...props }) => {
                    if (typeof props.children === 'string' && props.children.length > 0) {
                      return <HorseLink name={props.children} />
                    }
                    return <strong {...props} />
                  },
                }}
              >
                {horse.details}
              </ReactMarkdown>
            )}
          </div>
        </details>
      </div>
    )
  } else {
    return (
      <div className={`${summary({ sex: horse.sex })}`}>
        <BaseInfo {...horse} />
        {summarized && <br />}
        {summarized && <RecordsSummary records={summarized} />}
      </div>
    )
  }
}

const HorseDetailsStub = (horse: Horse) => {
  const summarized = filterRecords(horse.raceResults || [], 3)
  return (
    <div className={`${summary({ sex: horse.sex })}`}>
      <BaseInfo {...horse} />
    </div>
  )
}

// 馬名を整形する
// 競走名 / 血統名 (旧名 or 地方名)
function displayHorseName(horse: Horse): string {
  const base = horse.pedigreeName ? `${horse.name} / ${horse.pedigreeName}` : `${horse.name}`
  const display_name = horse.formerName
    ? `${base} (${horse.formerName})`
    : horse.localName
      ? `${base} (${horse.localName})`
      : base
  return display_name
}

const groupByYear = (records: RaceRecord[]) => {
  if (!Array.isArray(records)) {
    console.error('records is not an array:', records)
    return
  }
  return records.reduce(
    (acc, record) => {
      const year = record.date.getFullYear()
      if (!acc[year]) {
        acc[year] = []
      }
      acc[year].push(record)
      return acc
    },
    {} as Record<number, RaceRecord[]>
  )
}

const getRaceStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return 'text-red-700'
    case 2:
      return 'text-blue-500'
    case 3:
      return 'text-green-600'
    case 4:
      return ''
    case 5:
      return 'text-violet-600'
    case 6:
      return ''
    case 7:
      return ''
    default:
      return ''
  }
}

const RecordFormatter = (record: RaceRecord): JSX.Element => {
  return (
    <>
      {record.result !== '1' && <span>（{record.result}着）</span>}
      <span
        className={`mr-1 ${getRaceStyle(grades[record.grade].rank)} ${record.result === '1' ? 'font-bold' : ''}`}
      >
        {record.displayRace}
      </span>
    </>
  )
}

// const RecordsFormatter = (props: RecordsProp): JSX.Element => {
//   const grouped = groupByYear(props.records)
//   return (
//     <>
//       {grouped &&
//         Object.entries(grouped).map(([year, records]) => (
//           <div>
//             <span className="mr-1">{year}</span>
//             {records.map((record) => RecordFormatter(record))}
//           </div>
//         ))}
//     </>
//   )
// }

const RecordsSummary = (props: RecordsProp): JSX.Element => {
  const records: RaceRecord[] = props.records
  return (
    <>
      {records.map((record) => (
        <span key={`${record.date}-${record.displayRace}`} className="ml-3">
          <RecordFormatter {...record} />
          <span className="text-sm">（{yearOf(record.date)}）</span>
        </span>
      ))}
    </>
  )
}
