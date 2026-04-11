import { NextRequest, NextResponse } from 'next/server'
import { getBotToken, upsertBotChat } from '@/lib/bots'
import { getChatInfo, getChatMemberCount } from '@/lib/telegram'

// GET /api/bots/:id/chats — Список чатов бота (из локальной БД)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const typeFilter = searchParams.get('type')

    const { pool } = await import('@/lib/db')

    let query = `SELECT * FROM "bot_chats" WHERE "botId" = $1`
    const queryParams: (string | number)[] = [id, limit, offset]
    let paramCount = 1

    if (typeFilter) {
      paramCount++
      query += ` AND type = $${paramCount}`
      queryParams.push(typeFilter)
    }

    query += ` ORDER BY "lastSeen" DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    queryParams.push(limit, offset)

    const result = await pool.query(query, queryParams)

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM "bot_chats" WHERE "botId" = $1${typeFilter ? ' AND type = $2' : ''}`,
      typeFilter ? [id, typeFilter] : [id]
    )

    return NextResponse.json({
      chats: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
    })
  } catch (error) {
    console.error('Get chats error:', error)
    return NextResponse.json({ error: 'Failed to get chats' }, { status: 500 })
  }
}
