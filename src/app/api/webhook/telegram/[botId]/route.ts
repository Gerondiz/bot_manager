import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { upsertBotChat, saveIncomingMessage } from '@/lib/bots'

// POST /api/webhook/telegram/:botId
// Handler для входящих webhook от Telegram
export async function POST(
  request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params
    const body = await request.json()

    // Найти бота
    const { rows: botRows } = await pool.query(
      `SELECT id, enabled, "webhookUrl" FROM bots WHERE id = $1 AND enabled = true`,
      [botId]
    )

    if (botRows.length === 0) {
      return NextResponse.json({ error: 'Bot not found or disabled' }, { status: 404 })
    }

    const bot = botRows[0]

    // Обрабатываем сообщение
    if (body.message) {
      const msg = body.message

      // Получаем данные о чате
      const chatType = msg.chat.type // private, group, supergroup, channel
      const chatTitle = msg.chat.title
      const chatUsername = msg.chat.username

      // Upsert чата (авто-трекинг)
      await upsertBotChat(botId, {
        chatId: String(msg.chat.id),
        title: chatTitle,
        type: chatType,
        username: chatUsername,
      })

      // Extract photo/document file_ids
      let photoFileId: string | undefined
      let documentFileId: string | undefined

      if (msg.photo && msg.photo.length > 0) {
        // Берём самое большое фото (последнее в массиве)
        const largestPhoto = msg.photo[msg.photo.length - 1]
        photoFileId = largestPhoto.file_id
      }

      if (msg.document) {
        documentFileId = msg.document.file_id
      }

      // Сохранить сообщение с расширенными полями
      await saveIncomingMessage(botId, {
        chatId: String(msg.chat.id),
        userId: String(msg.from?.id || ''),
        username: msg.from?.username || null,
        firstName: msg.from?.first_name || null,
        text: msg.text || msg.caption || null,
        photoFileId,
        documentFileId,
        messageId: msg.message_id,
        replyToMsgId: msg.reply_to_message?.message_id,
      })
    }

    // Обрабатываем updates для групповых событий
    if (body.my_chat_member) {
      const mcc = body.my_chat_member
      // Бот добавлен в группу
      if (mcc.new_chat_member?.status === 'member' || mcc.new_chat_member?.status === 'administrator') {
        await upsertBotChat(botId, {
          chatId: String(mcc.chat.id),
          title: mcc.chat.title,
          type: mcc.chat.type,
          username: mcc.chat.username,
        })
      }
    }

    // Отправить событие в qwen_aaf (если настроен webhook)
    if (bot.webhookUrl && body.message) {
      const msg = body.message
      const event = {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event_type: 'bot.message.received',
        source: 'bot_manager',
        bot_id: botId,
        payload: {
          chat_id: String(msg.chat?.id),
          user_id: String(msg.from?.id),
          username: msg.from?.username,
          text: msg.text || msg.caption,
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
