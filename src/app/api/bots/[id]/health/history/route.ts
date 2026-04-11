import { NextRequest, NextResponse } from 'next/server'
import { getBotById } from '@/lib/bots'

// GET /api/bots/:id/health/history — История проверок здоровья
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bot = await getBotById(id)
    if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const { pool } = await import('@/lib/db')
    const result = await pool.query(
      `SELECT * FROM "health_checks" WHERE "botId" = $1 ORDER BY "checkedAt" DESC LIMIT $2`,
      [id, limit]
    )

    return NextResponse.json({
      history: result.rows,
      total: result.rows.length,
    })
  } catch (error) {
    console.error('Get health history error:', error)
    return NextResponse.json({ error: 'Failed to get health history' }, { status: 500 })
  }
}
