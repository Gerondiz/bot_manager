import { NextRequest, NextResponse } from 'next/server'
import { getBotToken, saveOutgoingMessage } from '@/lib/bots'
import { sendTextMessage, sendPhotoMessage, deleteMessage } from '@/lib/telegram'

// GET /api/bots/:id/messages — Список сообщений бота
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const chatId = searchParams.get('chatId')
    const direction = searchParams.get('direction') // INCOMING | OUTGOING

    const { pool } = await import('@/lib/db')

    let query = `SELECT * FROM messages WHERE "botId" = $1`
    const queryParams: (string | number)[] = [id]
    let paramCount = 1

    if (chatId) {
      paramCount++
      query += ` AND "chatId" = $${paramCount}`
      queryParams.push(chatId)
    }
    if (direction) {
      paramCount++
      query += ` AND direction = $${paramCount}`
      queryParams.push(direction)
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    queryParams.push(limit, offset)

    const result = await pool.query(query, queryParams)

    // Count
    let countQuery = `SELECT COUNT(*) FROM messages WHERE "botId" = $1`
    const countParams: (string | number)[] = [id]
    let cp = 1
    if (chatId) {
      cp++
      countQuery += ` AND "chatId" = $${cp}`
      countParams.push(chatId)
    }
    if (direction) {
      cp++
      countQuery += ` AND direction = $${cp}`
      countParams.push(direction)
    }

    const countResult = await pool.query(countQuery, countParams)

    return NextResponse.json({
      messages: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 })
  }
}

// POST /api/bots/:id/messages — Отправить сообщение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { chatId, text, parseMode, photo, document, replyToMessageId, caption } = body

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }
    if (!text && !photo && !document) {
      return NextResponse.json({ error: 'text, photo, or document is required' }, { status: 400 })
    }

    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    let result
    if (photo) {
      result = await sendPhotoMessage(token, chatId, photo, caption || text)
    } else if (text) {
      result = await sendTextMessage(token, chatId, text, { parseMode, replyToMessageId })
    } else {
      return NextResponse.json({ error: 'No message content' }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Save to DB
    await saveOutgoingMessage(id, {
      chatId,
      text: text || caption,
      messageId: result.messageId,
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
