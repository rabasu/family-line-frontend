import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

type Site = 'pedigreequery' | 'allbreed'

function runPython(args: string[]): Promise<{
  code: number | null
  stdout: string
  stderr: string
}> {
  const script = path.join(process.cwd(), 'scraping', 'pedigree_online.py')
  const python = process.env.PYTHON || 'python'

  return new Promise((resolve) => {
    const child = spawn(python, [script, ...args], {
      cwd: path.join(process.cwd(), 'scraping'),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const site = body?.site as Site
    const id = String(body?.id || '').trim()
    if (site !== 'pedigreequery' && site !== 'allbreed') {
      return NextResponse.json(
        { error: 'site must be pedigreequery or allbreed' },
        { status: 400 }
      )
    }
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { code, stdout, stderr } = await runPython([
      '--site',
      site,
      '--id',
      id,
    ])

    let parsed: Record<string, unknown> | null = null
    try {
      // ログが混ざる場合に備え、最後の JSON オブジェクトを拾う
      const start = stdout.indexOf('{')
      const end = stdout.lastIndexOf('}')
      if (start >= 0 && end > start) {
        parsed = JSON.parse(stdout.slice(start, end + 1))
      }
    } catch {
      parsed = null
    }

    if (!parsed) {
      return NextResponse.json(
        {
          error: 'python_parse_failed',
          detail: stderr || stdout.slice(0, 500),
          code,
        },
        { status: 502 }
      )
    }

    if (!parsed.ok) {
      return NextResponse.json(parsed, { status: 502 })
    }

    return NextResponse.json(parsed)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
