import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// GET /api/logs/error — только ошибки и критические ошибки
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const safeLimit = Math.min(limit, 500)

    const { rows } = await pool.query(
      `SELECT l.id, l."botId", l.level, l.message, l.context, l.timestamp, b.name as "botName"
       FROM bot_logs l
       LEFT JOIN bots b ON l."botId" = b.id
       WHERE l.level IN ('ERROR', 'CRITICAL')
       ORDER BY l.timestamp DESC
       LIMIT $1`,
      [safeLimit]
    )

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
    console.error('Error fetching error logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    )
  }
}
