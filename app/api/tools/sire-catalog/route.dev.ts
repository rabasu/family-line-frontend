import { NextRequest, NextResponse } from 'next/server'
import { searchSireCatalog } from '@/lib/sire-catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const hint = searchParams.get('hint') || ''
    const limit = Number(searchParams.get('limit') || '40')
    const result = await searchSireCatalog({ q, hint, limit })
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
