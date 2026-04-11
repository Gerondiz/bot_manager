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

    // Build query params correctly
    const chatParams: (string | number)[] = [id]
    let chatQuery = `SELECT * FROM "bot_chats" WHERE "botId" = $1`
    if (typeFilter) {
      chatQuery += ` AND type = $2`
      chatParams.push(typeFilter)
      chatQuery += ` ORDER BY "lastSeen" DESC LIMIT $3 OFFSET $4`
    } else {
      chatQuery += ` ORDER BY "lastSeen" DESC LIMIT $2 OFFSET $3`
    }
    chatParams.push(limit, offset)

    const result = await pool.query(chatQuery, chatParams)

    const countParams: (string | number)[] = [id]
    let countQuery = `SELECT COUNT(*) FROM "bot_chats" WHERE "botId" = $1`
    if (typeFilter) {
      countQuery += ` AND type = $2`
      countParams.push(typeFilter)
    }
    const countResult = await pool.query(countQuery, countParams)

    let chats = result.rows
    let total = parseInt(countResult.rows[0]?.count || '0')

    // Fallback: если bot_chats пуста, берём уникальные chatId из messages
    if (total === 0) {
      const msgResult = await pool.query(
        `SELECT "botId", "chatId", MAX("username") as "username", MAX("firstName") as "firstName",
            MAX(timestamp) as "lastSeen", MIN(timestamp) as "firstSeen",
            'private' as type
         FROM messages WHERE "botId" = $1
         GROUP BY "botId", "chatId"
         ORDER BY MAX(timestamp) DESC LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      )
      chats = msgResult.rows
      const msgCountResult = await pool.query(
        `SELECT COUNT(DISTINCT "chatId") FROM messages WHERE "botId" = $1`,
        [id]
      )
      total = parseInt(msgCountResult.rows[0]?.count || '0')
    }

    return NextResponse.json({
      chats,
      total,
    })
  } catch (error) {
    console.error('Get chats error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown'
    return NextResponse.json({ error: 'Failed to get chats', details: msg }, { status: 500 })
  }
}
