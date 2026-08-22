'use client'

import { useEffect, useState } from 'react'

type HorseMappingRow = {
  name: string
  ahonoora_id: string
  netkeiba_id: string
  netkeiba_dam_id: string
  jbis_id: string
  bogus_id: string
  new_bogus_id: string
  dam_id?: string
}

function emptyMappingRow(): HorseMappingRow {
  return {
    name: '',
    ahonoora_id: '',
    netkeiba_id: '',
    netkeiba_dam_id: '',
    jbis_id: '',
    bogus_id: '',
    new_bogus_id: '',
    dam_id: '',
  }
}

type FamilyRef = {
  filename: string
  pedigreeName: string
  rootHorseId: string
  familyHref: string
  dir?: string
}

type HorseRef = {
  id: string
  name: string
  filename: string
  pedigreeName: string
  rootHorseId: string
  familyHref: string
}

type ScrapeResult = {
  ok?: boolean
  error?: string
  movedCount?: number
  addCount?: number
  registeredHorses?: HorseRef[]
  createdFamilies?: FamilyRef[]
  updatedFamilies?: FamilyRef[]
  addedHorses?: HorseRef[]
  mdxCreated?: string[]
  stdoutTail?: string
  stderrTail?: string
}

const COLS: Array<{ key: keyof HorseMappingRow; label: string }> = [
  { key: 'name', label: 'name*' },
  { key: 'netkeiba_id', label: 'netkeiba_id' },
  { key: 'netkeiba_dam_id', label: 'netkeiba_dam_id' },
  { key: 'dam_id', label: 'dam_id' },
  { key: 'ahonoora_id', label: 'ahonoora_id' },
  { key: 'jbis_id', label: 'jbis_id' },
  { key: 'bogus_id', label: 'bogus_id' },
  { key: 'new_bogus_id', label: 'new_bogus_id' },
]

export default function HorseMappingScrapePanel() {
  const [rows, setRows] = useState<HorseMappingRow[]>([emptyMappingRow()])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<ScrapeResult | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/tools/horse-mapping-scrape')
        const json = await res.json()
        if (!res.ok || cancelled) return
        if (Array.isArray(json.items) && json.items.length) {
          setRows(json.items)
          setStatus(
            `horse_mapping_add.json の ${json.items.length}頭を読み込みました`
          )
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setCell = (index: number, key: keyof HorseMappingRow, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    )
  }

  const run = async () => {
    const horses = rows.filter((r) => (r.name || '').trim())
    if (!horses.length) {
      setError('name のある行を1頭以上入力してください')
      return
    }
    setRunning(true)
    setError('')
    setStatus('スクレイピング実行中… ブラウザ起動と複数サイト取得があるので待ってて')
    setResult(null)
    try {
      const res = await fetch('/api/tools/horse-mapping-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horses }),
      })
      const json = (await res.json()) as ScrapeResult
      if (!res.ok) throw new Error(json.error || 'scrape failed')
      setResult(json)
      if (json.ok) {
        setStatus(
          `完了（add.json ${json.addCount}頭 / mapping へ移動 ${json.movedCount}頭）。下のリザルトを確認して。`
        )
      } else {
        setError(json.error || 'スクレイピングが失敗しました')
        setStatus('途中まで進んでいる可能性があるのでリザルトも見て。')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="rounded border border-stone-300 bg-stone-50 p-4">
      <h2 className="text-lg font-medium">母馬未登録・netkeiba あり</h2>

      {error && (
        <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {status && (
        <div className="mt-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {status}
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-stone-100">
              {COLS.map((c) => (
                <th key={c.key} className="border border-stone-300 px-1 py-1 font-normal">
                  <div className="font-mono">{c.label}</div>
                </th>
              ))}
              <th className="border border-stone-300 px-1 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {COLS.map((c) => (
                  <td key={c.key} className="border border-stone-300 p-0">
                    <input
                      className="w-full min-w-[7rem] px-1 py-1 font-mono"
                      value={row[c.key] || ''}
                      onChange={(e) => setCell(i, c.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border border-stone-300 px-1">
                  <button
                    type="button"
                    className="text-[11px] text-stone-500 underline"
                    onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                    disabled={rows.length <= 1}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-stone-400 px-3 py-1 text-sm"
          onClick={() => setRows((prev) => [...prev, emptyMappingRow()])}
        >
          行を追加
        </button>
        <button
          type="button"
          className="rounded bg-stone-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          disabled={running}
          onClick={() => run()}
        >
          {running ? '実行中…' : 'マッピングを書いてスクレイピング'}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <div className="text-xs font-medium text-stone-700">登録した馬</div>
            {(result.registeredHorses || []).length === 0 ? (
              <p className="text-stone-500">マッチする馬名が見つかりませんでした</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {(result.registeredHorses || []).map((h) => (
                  <li key={h.id}>
                    <span className="font-medium">{h.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-stone-500">
                      {h.id} / {h.filename}
                    </span>
                    {h.familyHref ? (
                      <a
                        className="ml-2 text-sky-700 underline"
                        href={h.familyHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        牝系
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {(result.addedHorses || []).filter(
            (h) => !(result.registeredHorses || []).some((r) => r.id === h.id)
          ).length > 0 && (
            <div>
              <div className="text-xs font-medium text-stone-700">
                ついでに追加された馬（母系遡りなど）
              </div>
              <ul className="mt-1 space-y-0.5">
                {(result.addedHorses || [])
                  .filter(
                    (h) =>
                      !(result.registeredHorses || []).some((r) => r.id === h.id)
                  )
                  .map((h) => (
                    <li key={h.id}>
                      <span className="font-medium">{h.name}</span>
                      <span className="ml-2 font-mono text-[11px] text-stone-500">
                        {h.id} / {h.filename}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-xs font-medium text-stone-700">新規作成した牝系</div>
            {(result.createdFamilies || []).length === 0 ? (
              <p className="text-stone-500">なし</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {(result.createdFamilies || []).map((f) => (
                  <li key={`${f.dir}:${f.filename}`}>
                    {f.pedigreeName || f.rootHorseId}
                    <span className="ml-2 font-mono text-[11px] text-stone-500">
                      {f.filename}
                    </span>
                    {f.familyHref ? (
                      <a
                        className="ml-2 text-sky-700 underline"
                        href={f.familyHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ページ
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-stone-700">追加・更新した既存牝系</div>
            {(result.updatedFamilies || []).length === 0 ? (
              <p className="text-stone-500">なし</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {(result.updatedFamilies || []).map((f) => (
                  <li key={`${f.dir}:${f.filename}`}>
                    {f.pedigreeName || f.rootHorseId}
                    <span className="ml-2 font-mono text-[11px] text-stone-500">
                      {f.filename}
                    </span>
                    {f.familyHref ? (
                      <a
                        className="ml-2 text-sky-700 underline"
                        href={f.familyHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ページ
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {(result.stderrTail || result.stdoutTail) && (
            <details className="rounded border border-stone-200 bg-white px-2 py-1">
              <summary className="cursor-pointer text-xs text-stone-600">
                Python 出力（末尾）
              </summary>
              {result.stdoutTail ? (
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[11px]">
                  {result.stdoutTail}
                </pre>
              ) : null}
              {result.stderrTail ? (
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-red-800">
                  {result.stderrTail}
                </pre>
              ) : null}
            </details>
          )}
        </div>
      )}
    </section>
  )
}
