import Link from 'next/link'
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
    <div className={`border-y border-theme px-5 py-2 text-sm md:text-base ${rowBg}`}>
      {/* ─── 馬名 + 父母 ─── */}
      <div className="grid grid-cols-2 items-stretch">
        {/* 左: 馬名 + 生年 */}
        <div className="flex flex-col justify-center pr-3">
          <HorseNameWithPedigree horseId={entry.id} displayName={mainName(entry)} />
          {sub.length > 0 && <div className="text-xs text-muted">{sub.join('　')}</div>}
          <div className="text-xs tabular-nums text-muted">{entry.foaled.year ?? '?'}</div>
        </div>

        {/* 右: 父母（縦線・横線で分割） */}
        <div className="divide-y divide-theme border-l border-theme">
          <div className="py-0.5 pl-3 text-sm" title={entry.sire}>
            <span className="text-muted">父 </span>
            {isSearchableName(entry.sire) ? (
              <Link href={horseSearchHref({ sire: entry.sire })} className="link-inline">
                {entry.sire}
              </Link>
            ) : (
              '不詳'
            )}
          </div>
          <div className="flex items-center justify-between gap-x-1 py-0.5 pl-3 pr-1">
            <span className="text-sm" title={entry.dam}>
              <span className="text-muted">母 </span>
              {isSearchableName(entry.dam) ? (
                <Link href={horseSearchHref({ dam: entry.dam })} className="link-inline">
                  {entry.dam}
                </Link>
              ) : (
                '不詳'
              )}
            </span>
            <Link href={horseHref(entry.family)} className="link-inline shrink-0 text-xs">
              {entry.familyName}系
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 情報行: 戦績・賞金 ─── */}
      {(statsSummary || prizeText || entry.topRaceResults.length > 0) && (
        <div className="mt-1 border-t border-theme pt-1">
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
