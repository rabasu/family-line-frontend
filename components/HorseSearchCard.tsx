import { HorseSearchEntry } from '@/types/HorseSearchEntry'
import { horseHref } from '@/lib/horse-id'
import { horseSearchHref } from '@/lib/horse-search'
import { prizeMoneySummary, raceStatsSummary } from '@/lib/race-summary'
import { sexBg } from '@/lib/ui-theme'
import HorseNameWithPedigree from './HorseNameWithPedigree'
import { RecordsSummary } from './RecordsSummary'

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

function isSearchableName(value?: string): value is string {
  return Boolean(value && value !== '不詳')
}

interface Props {
  entry: HorseSearchEntry
}

export default function HorseSearchCard({ entry }: Props) {
  const statsSummary = raceStatsSummary(entry.raceStats)
  const prizeText = prizeMoneySummary(entry.prizeMoney)
  const rowBg = sexBg(entry.sex)
  const sub = subNames(entry)

  return (
    <div className={`border-theme border-y px-5 py-2 text-sm md:text-base ${rowBg}`}>
      {/* ─── 馬名 + 父母 ─── */}
      <div className="grid min-w-0 grid-cols-2 items-stretch">
        {/* 左: 馬名 + 生年 */}
        <div className="flex min-w-0 flex-col justify-center pr-3">
          <HorseNameWithPedigree horseId={entry.id} displayName={mainName(entry)} />
          {sub.length > 0 && <div className="text-muted text-xs">{sub.join('　')}</div>}
          <div className="text-muted text-xs tabular-nums">{entry.foaled.year ?? '?'}</div>
        </div>

        {/* 右: 父母（縦線・横線で分割） */}
        <div className="divide-theme border-theme min-w-0 divide-y overflow-hidden border-l">
          <div className="flex min-w-0 items-baseline gap-x-1 py-0.5 pl-3 pr-1 text-sm">
            <span className="text-muted shrink-0">父</span>
            {isSearchableName(entry.sire) ? (
              <a href={horseSearchHref({ sire: entry.sire })} className="link-inline min-w-0 truncate" title={entry.sire}>
                {entry.sire}
              </a>
            ) : (
              <span className="truncate">不詳</span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-x-2 py-0.5 pl-3 pr-1">
            <span className="flex min-w-[5rem] flex-1 items-baseline gap-x-1 overflow-hidden text-sm">
              <span className="text-muted shrink-0">母</span>
              {isSearchableName(entry.dam) ? (
                <a href={horseSearchHref({ dam: entry.dam })} className="link-inline min-w-0 truncate" title={entry.dam}>
                  {entry.dam}
                </a>
              ) : (
                <span className="truncate">不詳</span>
              )}
            </span>
            <a href={horseHref(entry.family)} className="link-inline max-w-[55%] shrink-0 truncate text-xs" title={`${entry.familyName}系`}>
              {entry.familyName}系
            </a>
          </div>
        </div>
      </div>

      {/* ─── 情報行: 戦績・賞金 ─── */}
      {(statsSummary || prizeText || entry.topRaceResults.length > 0) && (
        <div className="border-theme mt-1 border-t pt-1">
          {(statsSummary || prizeText) && (
            <div className="flex items-center gap-x-3 text-sm">
              {statsSummary && <span className="shrink-0">{statsSummary}</span>}
              {prizeText && <span className="shrink-0">{prizeText}</span>}
            </div>
          )}
          <RecordsSummary records={entry.topRaceResults} />
        </div>
      )}
    </div>
  )
}
