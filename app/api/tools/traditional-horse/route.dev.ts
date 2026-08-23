import { NextRequest, NextResponse } from 'next/server'
import { searchFatherHorses, searchTraditionalHorses } from '@/lib/traditional-horse-lookup'
import { checkTraditionalIdConflict } from '@/lib/traditional-family-write'
import { proposeTraditionalFilename } from '@/lib/horse-id'
import { resolveHorseId } from '@/lib/horse-id-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const checkId = searchParams.get('checkId') || ''
    const englishName = searchParams.get('englishName') || ''
    const name = searchParams.get('name') || ''
    const pedigreeName = searchParams.get('pedigreeName') || ''
    if (checkId || englishName || name || pedigreeName) {
      const horseId = await resolveHorseId({
        preferredId: checkId,
        englishName,
        name,
        pedigreeName,
      })
      const filename = proposeTraditionalFilename({
        id: horseId,
        englishName,
        name,
        pedigreeName,
      })
      const conflict = await checkTraditionalIdConflict({
        id: horseId,
        filename,
        englishName,
        name,
        pedigreeName,
      })
      return NextResponse.json({
        ...conflict,
        taken: conflict.idTaken || conflict.filenameTaken,
      })
    }
    const q = searchParams.get('q') || ''
    const limit = Number(searchParams.get('limit') || '20')
    const includeSires = searchParams.get('includeSires') === '1'
    const items = includeSires
      ? await searchFatherHorses(q, limit)
      : await searchTraditionalHorses(q, limit)
    return NextResponse.json({ count: items.length, items })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
