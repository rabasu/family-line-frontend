import { spawn } from 'child_process'
import path from 'path'
import { ensureUnreserved, proposeHorseId, slugifyId } from './horse-id'

const cache = new Map<string, string>()

function pythonGenerateHorseId(name: string): Promise<string> {
  const cached = cache.get(name)
  if (cached !== undefined) return Promise.resolve(cached)

  const script = path.join(process.cwd(), 'scraping', 'horse_id.py')
  const python = process.env.PYTHON || 'python'
  return new Promise((resolve) => {
    const payload = Buffer.from(name, 'utf8').toString('base64')
    const child = spawn(python, [script, '--b64', payload], {
      cwd: path.join(process.cwd(), 'scraping'),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        PYTHONWARNINGS: 'ignore',
      },
    })
    let stdout = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve('')
    }, 15000)
    child.stdout?.on('data', (d) => {
      stdout += String(d)
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolve('')
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const id = stdout.trim()
      if (code === 0 && id) {
        cache.set(name, id)
        resolve(id)
        return
      }
      resolve('')
    })
  })
}

/** 手打ち id ＞ 英名 ＞ 日本語名（馬名＞血統名）。自動生成は scraping/horse_id.py */
export async function resolveHorseId(options: {
  preferredId?: string
  englishName?: string
  name?: string
  pedigreeName?: string
}): Promise<string> {
  const preferred = (options.preferredId || '').trim()
  if (preferred && preferred !== 'new') return ensureUnreserved(slugifyId(preferred) || preferred)

  const en = (options.englishName || '').trim()
  const ja =
    (options.name || '').trim() || (options.pedigreeName || '').trim()
  const source = en || ja
  if (!source) return ''

  const generated = await pythonGenerateHorseId(source)
  if (generated) return ensureUnreserved(generated)
  return proposeHorseId({
    englishName: en,
    name: ja,
    pedigreeName: options.pedigreeName,
  })
}
