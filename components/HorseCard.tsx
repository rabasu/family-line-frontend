import { tv } from 'tailwind-variants'
import { Horse } from '@/types/Horse'
import { sex as sexes } from '@/types/Horse'
import { grades } from '@/types/Grade'
import RaceRecord from '@/types/RaceResult'
import { formatBreedMark } from '@/lib/breed-mark'
import { filterHighlightRaces } from '@/lib/race-summary'
import HorseLink from './HorseLink'
import HorseNameWithPedigree from './HorseNameWithPedigree'
import { RecordsSummary } from './RecordsSummary'
import { formatSireDisplayName } from '@/lib/origin-country-index'
import { sexBgClass } from '@/lib/ui-theme'

const summary = tv({
  base: 'px-5 py-1',
  variants: {
    sex: sexBgClass,
  },
})

const BaseInfo = (horse: Horse): JSX.Element => {
  const breedMark = formatBreedMark(horse.breed)
  return (
    <div className="flex flex-wrap items-baseline gap-x-1">
      <span className="inline-flex min-w-0 max-w-full items-baseline gap-x-1">
        <HorseNameWithPedigree
          horseId={horse.id}
          displayName={displayHorseName(horse)}
          className="min-w-0 text-base md:text-lg"
        />
        {breedMark && <span className="shrink-0 text-xs font-medium text-muted">{breedMark}</span>}
      </span>
      <span className="text-sm">
        （{horse.foaled.year}） by{' '}
        <HorseLink
          name={horse.sire}
          horseId={horse.sireId}
          displayName={formatSireDisplayName(horse.sire, horse.sireId)}
        />
      </span>
    </div>
  )
}

function HorseCard(horse: Horse) {
  const won_races: RaceRecord[] | undefined = horse.raceResults?.filter((record) => record.result === '1')
  // 勝ち鞍の最高格付け 重賞勝ち鞍がない場合は0
  const horse_rank = won_races ? Math.max(...won_races.map((record) => grades[record.grade].rank)) : 0
  return (
    <div className="horse-card relative w-[40rem] text-sm md:text-base">
      <div className="horse-card-panel">
        <HorseDetails {...horse} />
      </div>
    </div>
  )
}

export default HorseCard

const HorseDetails = (horse: Horse) => {
  const summarized = filterHighlightRaces(horse.raceResults || [], 3)
  return (
    <div className={`${summary({ sex: horse.sex })}`}>
      <BaseInfo {...horse} />
      {summarized && <RecordsSummary records={summarized} />}
    </div>
  )
}

// 馬名を整形する
// 競走名 / 血統名 (旧名 or 地方名)
export function displayHorseName(horse: Horse): string {
  const base = horse.name && horse.pedigreeName ? `${horse.name} / ${horse.pedigreeName}` : `${horse.name ?? horse.pedigreeName}`
  const display_name = horse.formerName ? `${base} ［${horse.formerName}］` : horse.localName ? `${base} ［${horse.localName}］` : base
  return display_name
}

export { RecordsSummary }
