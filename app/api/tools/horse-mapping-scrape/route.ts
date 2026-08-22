import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import {
  loadHorseMappingAdd,
  normalizeMappingRow,
  rotateAndWriteMappingAdd,
  type HorseMappingRow,
} from '@/lib/horse-mapping'
import {
  diffPedigreeSnapshots,
  regeneratePedigreeIndexes,
  snapshotPedigreeHorses,
  writeFamilyMdx,
} from '@/lib/traditional-family-write'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 600

function runPythonIntegrator(): Promise<{
  code: number | null
  stdout: string
  stderr: string
}> {
  const script = path.join(
    process.cwd(),
    'scraping',
    'multi_scraping_integrator.py'
  )
  const python = process.env.PYTHON || 'python'
  return new Promise((resolve) => {
    const child = spawn(python, [script], {
      cwd: path.join(process.cwd(), 'scraping'),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        PYTHONUNBUFFERED: '1',
      },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (buf) => {
      stdout += buf.toString('utf8')
    })
    child.stderr.on('data', (buf) => {
      stderr += buf.toString('utf8')
    })
    child.on('close', (code) => resolve({ code, stdout, stderr }))
    child.on('error', (err) =>
      resolve({ code: 1, stdout: '', stderr: String(err) })
    )
  })
}

export async function GET() {
  try {
    const items = await loadHorseMappingAdd()
    return NextResponse.json({ count: items.length, items })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const raw = Array.isArray(body?.horses) ? body.horses : []
    const horses: HorseMappingRow[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const row = normalizeMappingRow(item as Record<string, unknown>)
      if (row) horses.push(row)
    }
    if (!horses.length) {
      return NextResponse.json(
        { error: 'name のある馬を1頭以上入力してください' },
        { status: 400 }
      )
    }
    for (const h of horses) {
      if (!h.netkeiba_id && !h.netkeiba_dam_id) {
        return NextResponse.json(
          {
            error: `${h.name}: netkeiba_id か netkeiba_dam_id が必要です`,
          },
          { status: 400 }
        )
      }
    }

    const before = await snapshotPedigreeHorses()
    const rotated = await rotateAndWriteMappingAdd(horses)
    const py = await runPythonIntegrator()
    const after = await snapshotPedigreeHorses()
    const diff = diffPedigreeSnapshots(before, after)

    const mdxNotes: string[] = []
    for (const fam of diff.createdFamilies) {
      if (fam.dir !== 'traditional' || !fam.rootHorseId) continue
      const mdx = await writeFamilyMdx({
        rootHorseId: fam.rootHorseId,
        displayName: fam.pedigreeName || fam.rootHorseId,
      })
      if (mdx.created) mdxNotes.push(`${fam.rootHorseId}.mdx`)
    }

    const indexNotes = await regeneratePedigreeIndexes()

    const names = new Set(horses.map((h) => h.name))
    const registered = [
      ...diff.addedHorses.filter((h) => names.has(h.name)),
      ...[...after.horses.values()].filter(
        (h) =>
          names.has(h.name) && !diff.addedHorses.some((a) => a.id === h.id)
      ),
    ]
    const seen = new Set<string>()
    const registeredHorses = registered.filter((h) => {
      if (seen.has(h.id)) return false
      seen.add(h.id)
      return true
    })

    const ok = py.code === 0
    return NextResponse.json({
      ok,
      pythonCode: py.code,
      movedCount: rotated.movedCount,
      addCount: rotated.addCount,
      registeredHorses,
      createdFamilies: diff.createdFamilies,
      updatedFamilies: diff.updatedFamilies.filter(
        (f) =>
          !diff.createdFamilies.some(
            (c) => c.dir === f.dir && c.filename === f.filename
          )
      ),
      addedHorses: diff.addedHorses,
      mdxCreated: mdxNotes,
      indexNotes,
      stdoutTail: py.stdout.slice(-4000),
      stderrTail: py.stderr.slice(-4000),
      error: ok
        ? undefined
        : `multi_scraping_integrator が終了コード ${py.code} で失敗しました`,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
