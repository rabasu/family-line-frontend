import { tv } from 'tailwind-variants'
import { Horse } from '@/types/Horse'
import { sex as sexes } from '@/types/Horse'
import { grades } from '@/types/Grade'
import RaceRecord from '@/types/RaceResult'
import { formatBreedMark } from '@/lib/breed-mark'
import { filterHighlightRaces, raceStatsSummary } from '@/lib/race-summary'
import { yearOf } from 'app/lib/utils'
import HorseLink from './HorseLink'
import HorseMarkdown from './HorseMarkdown'
import HorseNameWithPedigree from './HorseNameWithPedigree'
import { PrizeMoney } from '@/types/PrizeMoney'

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

const BaseInfo = (horse: Horse): JSX.Element => {
  const breedMark = formatBreedMark(horse.breed)
  return (
    <div className="flex flex-nowrap items-baseline gap-x-1 whitespace-nowrap">
      <HorseNameWithPedigree horseId={horse.id} displayName={displayHorseName(horse)} />
      {breedMark && <span className="text-xs font-medium text-stone-500">{breedMark}</span>}
      <span className="text-sm">
        （{horse.foaled.year}） by <HorseLink name={horse.sire} />
      </span>
      <span>
        {raceStatsSummary(horse.raceStats)} {prizeMoneySummary(horse.prizeMoney)}
      </span>
    </div>
  )
}

export function prizeMoneySummary(prizeMoney: PrizeMoney | undefined): string {
  if (!prizeMoney) {
    return ''
  }
  if (prizeMoney.total == '0.0万円' || prizeMoney.total == '0万円') {
    // 現状「0.0万円」「0万円」にはデータ不足が含まれるため、空欄とする
    return ''
  } else {
    return prizeMoney.total
  }
}

function HorseCard(horse: Horse) {
  const won_races: RaceRecord[] | undefined = horse.raceResults?.filter((record) => record.result === '1')
  // 勝ち鞍の最高格付け 重賞勝ち鞍がない場合は0
  const horse_rank = won_races ? Math.max(...won_races.map((record) => grades[record.grade].rank)) : 0
  return (
    <div className="horse-card w-[40rem] text-sm md:text-base">
      <div className="-ml-2 pt-3 ">
        <div className="before:display-block card rounded-none bg-base-100 shadow-xl before:absolute before:z-10 before:mt-2 before:h-3 before:w-3 before:bg-black before:opacity-50 before:content-['']">
          <HorseDetails {...horse} />
        </div>
      </div>
    </div>
  )
}

export default HorseCard

const HorseDetails = (horse: Horse) => {
  const summarized = filterHighlightRaces(horse.raceResults || [], 3)
  if (horse.details) {
    return (
      <div className="">
        <details className="collapse collapse-arrow rounded-none">
          <summary className={`collapse-title  min-h-0 ${summary({ sex: horse.sex })} `}>
            <BaseInfo {...horse} />
            {summarized && <RecordsSummary records={summarized} />}
          </summary>
          <div className="collapse-content rounded-none">
            {typeof horse.details === 'string' && <HorseMarkdown markdown={horse.details} />}
          </div>
        </details>
      </div>
    )
  } else {
    return (
      <div className={`${summary({ sex: horse.sex })}`}>
        <BaseInfo {...horse} />
        {/* {summarized && <br />} */}
        {summarized && <RecordsSummary records={summarized} />}
      </div>
    )
  }
}

// 馬名を整形する
// 競走名 / 血統名 (旧名 or 地方名)
export function displayHorseName(horse: Horse): string {
  const base = horse.name && horse.pedigreeName ? `${horse.name} / ${horse.pedigreeName}` : `${horse.name ?? horse.pedigreeName}`
  const display_name = horse.formerName ? `${base} ［${horse.formerName}］` : horse.localName ? `${base} ［${horse.localName}］` : base
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

const RecordChip = (record: RaceRecord): JSX.Element => {
  const isWin = record.result === '1'
  return (
    <span className="inline-flex items-baseline gap-x-1.5 bg-black/[0.06] px-2 py-0.5 dark:bg-white/10">
      {!isWin && <span className="text-gray-500 dark:text-gray-400">{record.result}着</span>}
      <span className={`${getRaceStyle(grades[record.grade].rank)} ${isWin ? 'font-bold' : ''}`}>{record.displayRace}</span>
      <span className="text-gray-500 dark:text-gray-400">{yearOf(record.date)}</span>
    </span>
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
//             {records.map((record) => RecordChip(record))}
//           </div>
//         ))}
//     </>
//   )
// }

export const RecordsSummary = (props: RecordsProp): JSX.Element => {
  const records: RaceRecord[] = props.records
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {records.map((record) => (
        <RecordChip key={`${record.date}-${record.displayRace}`} {...record} />
      ))}
    </div>
  )
}
