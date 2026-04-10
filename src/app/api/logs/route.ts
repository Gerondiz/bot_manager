import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const safeLimit = Math.min(limit, 500)

    let query = `
      SELECT l.id, l."botId", l.level, l.message, l.context, l.timestamp, b.name as "botName"
      FROM bot_logs l
      LEFT JOIN bots b ON l."botId" = b.id
    `
    const values: unknown[] = []

    if (level && level !== 'all') {
      query += ` WHERE l.level = $1`
      values.push(level)
    }

    query += ` ORDER BY l.timestamp DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
    values.push(safeLimit, offset)

    const { rows } = await pool.query(query, values)

    return NextResponse.json({
      logs: rows.map((row) => ({
        id: row.id,
        botId: row.botId,
        botName: row.botName ?? 'system',
        level: row.level,
        message: row.message,
        context: row.context,
        timestamp: new Date(row.timestamp).toISOString(),
      })),
      total: rows.length,
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
