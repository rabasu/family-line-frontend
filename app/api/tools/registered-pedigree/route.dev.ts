import { NextRequest, NextResponse } from 'next/server'
import { loadRegisteredPedigree } from '@/lib/registered-pedigree'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id') || ''
    if (!id.trim()) {
      return NextResponse.json({ error: 'horseId が必要です' }, { status: 400 })
    }
    const pedigree = await loadRegisteredPedigree(id)
    if (!pedigree) {
      return NextResponse.json({ error: `登録済みの馬が見つかりません: ${id.trim()}` }, { status: 404 })
    }
    return NextResponse.json({ ok: true, ...pedigree })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
