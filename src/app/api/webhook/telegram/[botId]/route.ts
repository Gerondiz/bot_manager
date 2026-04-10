import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/webhook/telegram/:botId
// Handler для входящих webhook от Telegram
export async function POST(
  request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params
    const body = await request.json()

    // Верификация webhook (опционально)
    const secret = request.headers.get('x-telegram-bot-api-secret-token')
    // TODO: Verify against stored secret

    // Найти бота
    const bot = await db.bot.findUnique({
      where: { id: botId },
    })

    if (!bot || !bot.enabled) {
      return NextResponse.json({ error: 'Bot not found or disabled' }, { status: 404 })
    }

    // Сохранить сообщение
    if (body.message) {
      await db.message.create({
        data: {
          botId,
          chatId: String(body.message.chat.id),
          userId: String(body.message.from.id),
          username: body.message.from.username || null,
          direction: 'INCOMING',
          text: body.message.text || '',
        },
      })
    }

    // Отправить событие в qwen_aaf (если настроен webhook)
    if (bot.webhookUrl) {
      const event = {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event_type: 'bot.message.received',
        source: 'bot_manager',
        bot_id: botId,
        payload: {
          chat_id: String(body.message?.chat?.id),
          user_id: String(body.message?.from?.id),
          username: body.message?.from?.username,
          text: body.message?.text,
          timestamp: new Date().toISOString(),
        },
      }

      // TODO: Send to AAF webhook with HMAC signature
      // await fetch(bot.webhookUrl, { ... })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
