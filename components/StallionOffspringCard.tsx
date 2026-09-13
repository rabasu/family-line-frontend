import Link from 'next/link'
import { horseHref } from '@/lib/horse-id'
import { tv } from 'tailwind-variants'
import type { Horse } from '@/types/Horse'
import { formatBreedMark } from '@/lib/breed-mark'
import { filterHighlightRaces, hasGradeWin, raceStatsSummary } from '@/lib/race-summary'
import HorseLink from './HorseLink'
import HorseNameWithPedigree from './HorseNameWithPedigree'
import { displayHorseName, prizeMoneySummary, RecordsSummary } from './HorseCard'

const summary = tv({
  base: 'px-5 py-1.5',
  variants: {
    sex: {
      male: 'bg-cyan-100',
      female: 'bg-red-50',
      gelding: 'bg-green-100',
    },
  },
})

type Props = {
  horse: Horse
  familyName: string
  familyRootId: string
}

/**
 * 種牡馬成績用の産駒行。HorseCard の要約行に、母名・牝系を足した形。
 */
export default function StallionOffspringCard({ horse, familyName, familyRootId }: Props) {
  const breedMark = formatBreedMark(horse.breed)
  const summarized = filterHighlightRaces(horse.raceResults || [], 3)
  const gradeWin = hasGradeWin(horse.raceResults)

  return (
    <div data-grade-win={gradeWin ? 'true' : 'false'} className={summary({ sex: horse.sex })}>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <HorseNameWithPedigree horseId={horse.id} displayName={displayHorseName(horse)} />
        {breedMark && <span className="text-xs font-medium text-stone-500">{breedMark}</span>}
        <span className="text-sm">（{horse.foaled.year}）</span>
        <span>
          {raceStatsSummary(horse.raceStats)} {prizeMoneySummary(horse.prizeMoney)}
        </span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-sm text-stone-600">
        <span>
          母 {horse.dam ? <HorseLink name={horse.dam} /> : '不詳'}
        </span>
        <span className="text-stone-400">·</span>
        <Link href={horseHref(familyRootId)} className="text-sky-700 hover:underline">
          {familyName}系
        </Link>
      </div>
      {summarized.length > 0 && <RecordsSummary records={summarized} />}
    </div>
  )
}
