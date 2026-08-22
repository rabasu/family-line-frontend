'use client'

import type { ReactNode } from 'react'
import { ALL_BREEDS, type Breed } from '@/types/Breed'
import { grades, type GradeCode } from '@/types/Grade'
import { sex as sexLabel, type Sex } from '@/types/Horse'
import {
  emptyRaceResult,
  type EditorSubject,
  type RaceResultInput,
} from './subject'

export type CellFetchSite = 'pedigreequery' | 'allbreed'

const GRADE_CODES = Object.keys(grades) as GradeCode[]
const INPUT =
  'w-full rounded border border-stone-300 bg-white px-2 py-1 text-sm'
const DATE_INPUT =
  'min-w-0 w-0 rounded border border-stone-300 bg-white px-2 py-1 text-sm'

type Props = {
  subject: EditorSubject
  onChange: (next: EditorSubject) => void
  fetching?: string | null
  onFetch?: (site: CellFetchSite) => void
  nameLabel?: string
  idEditable?: boolean
  idWarning?: string
  showSex?: 'hidden' | 'select' | 'female' | 'male'
  extrasDefaultOpen?: boolean
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode
  required?: boolean
}) {
  return (
    <span className="mb-0.5 block text-xs text-stone-500">
      {children}
      {required ? '*' : ''}
    </span>
  )
}

export default function SubjectFields({
  subject,
  onChange,
  fetching,
  onFetch,
  nameLabel = '馬名',
  idEditable,
  idWarning,
  showSex = 'hidden',
  extrasDefaultOpen = false,
}: Props) {
  const set = (patch: Partial<EditorSubject>) => onChange({ ...subject, ...patch })
  const setResult = (index: number, patch: Partial<RaceResultInput>) => {
    const next = subject.raceResults.map((r, i) =>
      i === index ? { ...r, ...patch } : r
    )
    set({ raceResults: next })
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-sm lg:grid-cols-4">
      <label>
        <FieldLabel>{nameLabel}</FieldLabel>
        <input
          className={INPUT}
          value={subject.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>
      <label>
        <FieldLabel>血統名</FieldLabel>
        <input
          className={INPUT}
          value={subject.pedigreeName}
          onChange={(e) => set({ pedigreeName: e.target.value })}
        />
      </label>
      <label>
        <FieldLabel>英名</FieldLabel>
        <input
          className={INPUT}
          value={subject.englishName}
          onChange={(e) => set({ englishName: e.target.value })}
        />
      </label>
      <label>
        <FieldLabel>旧馬名</FieldLabel>
        <input
          className={INPUT}
          value={subject.formerName}
          onChange={(e) => set({ formerName: e.target.value })}
        />
      </label>
      <label>
        <FieldLabel>旧血統名</FieldLabel>
        <input
          className={INPUT}
          value={subject.formerPedigreeName}
          onChange={(e) => set({ formerPedigreeName: e.target.value })}
        />
      </label>
      <label>
        <FieldLabel>地方名</FieldLabel>
        <input
          className={INPUT}
          value={subject.localName}
          onChange={(e) => set({ localName: e.target.value })}
        />
      </label>
      <label>
        <FieldLabel required>id</FieldLabel>
        <input
          className={`${INPUT} font-mono text-xs`}
          value={subject.id}
          onChange={(e) => set({ id: e.target.value })}
          disabled={!idEditable}
        />
        {idWarning ? (
          <div className="mt-0.5 text-[11px] text-red-700">{idWarning}</div>
        ) : null}
      </label>
      {showSex === 'select' ? (
        <label>
          <FieldLabel required>性別</FieldLabel>
          <select
            className={INPUT}
            value={subject.sex}
            onChange={(e) => set({ sex: (e.target.value || '') as Sex | '' })}
          >
            <option value="" />
            {(Object.keys(sexLabel) as Sex[]).map((s) => (
              <option key={s} value={s}>
                {sexLabel[s]}
              </option>
            ))}
          </select>
        </label>
      ) : showSex === 'female' || showSex === 'male' ? (
        <div>
          <FieldLabel required>性別</FieldLabel>
          <div className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-stone-700">
            {showSex === 'female' ? '牝' : '牡'}
          </div>
        </div>
      ) : null}

      <label className="col-span-2 min-w-0">
        <FieldLabel required>生年月日</FieldLabel>
        <div className="flex min-w-0 items-center gap-1">
          <input
            className={`${DATE_INPUT} flex-[1.4]`}
            value={subject.foaledYear}
            onChange={(e) => set({ foaledYear: e.target.value })}
            inputMode="numeric"
            aria-label="生年"
          />
          <span className="shrink-0 text-stone-400">/</span>
          <input
            className={`${DATE_INPUT} flex-1`}
            value={subject.foaledMonth}
            onChange={(e) => set({ foaledMonth: e.target.value })}
            inputMode="numeric"
            aria-label="生月"
          />
          <span className="shrink-0 text-stone-400">/</span>
          <input
            className={`${DATE_INPUT} flex-1`}
            value={subject.foaledDay}
            onChange={(e) => set({ foaledDay: e.target.value })}
            inputMode="numeric"
            aria-label="生日"
          />
        </div>
      </label>
      <label>
        <FieldLabel>毛色</FieldLabel>
        <input
          className={INPUT}
          value={subject.color}
          onChange={(e) => set({ color: e.target.value })}
        />
      </label>
      <label>
        <FieldLabel>品種</FieldLabel>
        <select
          className={INPUT}
          value={subject.breed}
          onChange={(e) => set({ breed: (e.target.value || '') as Breed | '' })}
        >
          <option value="" />
          {ALL_BREEDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>

      <label className="col-span-2">
        <FieldLabel>生産者</FieldLabel>
        <input
          className={INPUT}
          value={subject.breeder}
          onChange={(e) => set({ breeder: e.target.value })}
        />
      </label>
      <label className="col-span-2">
        <FieldLabel>所有者</FieldLabel>
        <input
          className={INPUT}
          value={subject.owner}
          onChange={(e) => set({ owner: e.target.value })}
        />
      </label>

      <label>
        <FieldLabel>netkeibaId</FieldLabel>
        <input
          className={INPUT}
          value={subject.netkeibaId}
          onChange={(e) => set({ netkeibaId: e.target.value })}
        />
      </label>
      <label>
        <FieldLabel>pedigreeQueryId</FieldLabel>
        <div className="flex gap-1">
          <input
            className={`${INPUT} min-w-0 flex-1 font-mono text-xs`}
            value={subject.pedigreeQueryId}
            onChange={(e) => set({ pedigreeQueryId: e.target.value })}
          />
          {onFetch && (
            <button
              type="button"
              disabled={!!fetching}
              className="shrink-0 rounded border border-stone-400 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => onFetch('pedigreequery')}
            >
              {fetching === 'pedigreequery' ? '…' : 'PQ'}
            </button>
          )}
        </div>
        {subject.pedigreeQueryId.trim() && (
          <a
            className="mt-0.5 inline-block text-[11px] text-sky-700 underline"
            href={`https://www.pedigreequery.com/${subject.pedigreeQueryId.trim().replace(/ /g, '+')}`}
            target="_blank"
            rel="noreferrer"
          >
            サイトを開く
          </a>
        )}
      </label>
      <label className="col-span-2">
        <FieldLabel>allBreedPedigreeId</FieldLabel>
        <div className="flex gap-1">
          <input
            className={`${INPUT} min-w-0 flex-1 font-mono text-xs`}
            value={subject.allBreedPedigreeId}
            onChange={(e) => set({ allBreedPedigreeId: e.target.value })}
          />
          {onFetch && (
            <button
              type="button"
              disabled={!!fetching}
              className="shrink-0 rounded border border-stone-400 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => onFetch('allbreed')}
            >
              {fetching === 'allbreed' ? '…' : 'AB'}
            </button>
          )}
        </div>
        {subject.allBreedPedigreeId.trim() && (
          <a
            className="mt-0.5 inline-block text-[11px] text-sky-700 underline"
            href={`https://www.allbreedpedigree.com/${subject.allBreedPedigreeId.trim().replace(/ /g, '+')}`}
            target="_blank"
            rel="noreferrer"
          >
            サイトを開く
          </a>
        )}
      </label>

      <label className="col-span-2">
        <FieldLabel>出典</FieldLabel>
        <textarea
          className="min-h-[3.5rem] w-full rounded border border-stone-300 px-2 py-1 text-sm"
          value={subject.source}
          onChange={(e) => set({ source: e.target.value })}
        />
      </label>
      <label className="col-span-2">
        <FieldLabel>コメント</FieldLabel>
        <textarea
          className="min-h-[3.5rem] w-full rounded border border-stone-300 px-2 py-1 text-sm"
          value={subject.comment}
          onChange={(e) => set({ comment: e.target.value })}
        />
      </label>

      <details
        className="col-span-2 rounded border border-stone-200 bg-white px-3 py-2 lg:col-span-4"
        open={extrasDefaultOpen || undefined}
      >
        <summary className="cursor-pointer text-xs font-medium text-stone-700">
          牝祖属性・競走成績
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4">
          <label>
            <FieldLabel>輸入年</FieldLabel>
            <input
              className={INPUT}
              value={subject.importedYear}
              onChange={(e) => set({ importedYear: e.target.value })}
            />
          </label>
          <label>
            <FieldLabel>輸入者</FieldLabel>
            <input
              className={INPUT}
              value={subject.importedBy}
              onChange={(e) => set({ importedBy: e.target.value })}
            />
          </label>
          <label>
            <FieldLabel>系統番号</FieldLabel>
            <input
              className={INPUT}
              value={subject.familyNumber}
              onChange={(e) => set({ familyNumber: e.target.value })}
            />
          </label>
          <label>
            <FieldLabel>登録番号</FieldLabel>
            <input
              className={INPUT}
              value={subject.registration}
              onChange={(e) => set({ registration: e.target.value })}
            />
          </label>
          <label>
            <FieldLabel>通算出走</FieldLabel>
            <input
              className={INPUT}
              value={subject.raceStatsRuns}
              onChange={(e) => set({ raceStatsRuns: e.target.value })}
              inputMode="numeric"
            />
          </label>
          <label>
            <FieldLabel>通算勝利</FieldLabel>
            <input
              className={INPUT}
              value={subject.raceStatsWins}
              onChange={(e) => set({ raceStatsWins: e.target.value })}
              inputMode="numeric"
            />
          </label>
          <div className="col-span-2 lg:col-span-4">
            <div className="mb-1 flex items-center justify-between">
              <FieldLabel>重賞成績</FieldLabel>
              <button
                type="button"
                className="text-xs text-sky-800 underline"
                onClick={() =>
                  set({ raceResults: [...subject.raceResults, emptyRaceResult()] })
                }
              >
                行を追加
              </button>
            </div>
            {subject.raceResults.length > 0 ? (
              <ul className="space-y-2">
                {subject.raceResults.map((r, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-2 gap-1 rounded border border-stone-200 bg-stone-50 p-2 sm:grid-cols-4 lg:grid-cols-6"
                  >
                    <label>
                      <FieldLabel>レース</FieldLabel>
                      <input
                        className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
                        value={r.race}
                        onChange={(e) => setResult(i, { race: e.target.value })}
                      />
                    </label>
                    <label>
                      <FieldLabel>表示名</FieldLabel>
                      <input
                        className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
                        value={r.displayRace}
                        onChange={(e) =>
                          setResult(i, { displayRace: e.target.value })
                        }
                      />
                    </label>
                    <label className="col-span-2 min-w-0">
                      <FieldLabel>年月日</FieldLabel>
                      <div className="flex min-w-0 items-center gap-1">
                        <input
                          className="min-w-0 w-0 flex-[1.4] rounded border border-stone-300 px-1 py-0.5 text-xs"
                          value={r.year}
                          onChange={(e) => setResult(i, { year: e.target.value })}
                        />
                        <input
                          className="min-w-0 w-0 flex-1 rounded border border-stone-300 px-1 py-0.5 text-xs"
                          value={r.month}
                          onChange={(e) => setResult(i, { month: e.target.value })}
                        />
                        <input
                          className="min-w-0 w-0 flex-1 rounded border border-stone-300 px-1 py-0.5 text-xs"
                          value={r.day}
                          onChange={(e) => setResult(i, { day: e.target.value })}
                        />
                      </div>
                    </label>
                    <label>
                      <FieldLabel>grade</FieldLabel>
                      <select
                        className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
                        value={r.grade}
                        onChange={(e) => setResult(i, { grade: e.target.value })}
                      >
                        <option value="" />
                        {GRADE_CODES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <FieldLabel>競馬場</FieldLabel>
                      <input
                        className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
                        value={r.racecourse}
                        onChange={(e) =>
                          setResult(i, { racecourse: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      <FieldLabel>距離</FieldLabel>
                      <input
                        className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
                        value={r.distance}
                        onChange={(e) => setResult(i, { distance: e.target.value })}
                      />
                    </label>
                    <label>
                      <FieldLabel>着</FieldLabel>
                      <input
                        className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
                        value={r.result}
                        onChange={(e) => setResult(i, { result: e.target.value })}
                      />
                    </label>
                    <label>
                      <FieldLabel>頭</FieldLabel>
                      <input
                        className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
                        value={r.entry}
                        onChange={(e) => setResult(i, { entry: e.target.value })}
                      />
                    </label>
                    <label>
                      <FieldLabel>人気</FieldLabel>
                      <input
                        className="w-full rounded border border-stone-300 px-1 py-0.5 text-xs"
                        value={r.favorite}
                        onChange={(e) => setResult(i, { favorite: e.target.value })}
                      />
                    </label>
                    <button
                      type="button"
                      className="self-end text-[11px] text-stone-500 underline"
                      onClick={() =>
                        set({
                          raceResults: subject.raceResults.filter(
                            (_, j) => j !== i
                          ),
                        })
                      }
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  )
}
