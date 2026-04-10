import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { sendTestMessage } from '@/lib/telegram'

// POST /api/bots/:id/test
// Отправляет тестовое сообщение от имени бота для проверки работоспособности
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { chatId, text } = body

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }

    // Получаем бота с токеном
    const { rows } = await pool.query(
      `SELECT id, name, type, token, enabled FROM bots WHERE id = $1`,
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const bot = rows[0]

    if (!bot.enabled) {
      return NextResponse.json({ error: 'Bot is disabled' }, { status: 400 })
    }

    if (bot.type !== 'TELEGRAM') {
      return NextResponse.json({ error: 'Test message only supported for Telegram bots' }, { status: 400 })
    }

    // Отправляем тестовое сообщение
    const testText = text || `✅ Тестовое сообщение от bot_manager\nБот: ${bot.name}\nВремя: ${new Date().toLocaleString('ru-RU')}`

    const result = await sendTestMessage(bot.token, String(chatId), testText)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to send test message',
      }, { status: 400 })
    }

    // Сохраняем сообщение в БД
    await pool.query(
      `INSERT INTO messages ("botId", "chatId", "userId", username, direction, text, timestamp)
       VALUES ($1, $2, $3, $4, 'OUTGOING', $5, NOW())`,
      [id, String(chatId), 'test', 'bot_manager', testText]
    )

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Test message sent successfully',
      chatId,
      text: testText,
    })
  } catch (error) {
    console.error('Test message error:', error)
    return NextResponse.json({ error: 'Failed to send test message' }, { status: 500 })
  }
}
