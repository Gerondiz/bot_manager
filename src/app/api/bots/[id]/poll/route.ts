import { NextRequest, NextResponse } from 'next/server'
import { getBotToken } from '@/lib/bots'
import { getUpdates } from '@/lib/telegram'
import { upsertBotChat, saveIncomingMessage } from '@/lib/bots'

// POST /api/bots/:id/poll — Подтянуть сообщения из Telegram через getUpdates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const body = await request.json()
    const limit = Math.min(body?.limit || 100, 100)

    // Получаем offset из запроса или берём 0
    const offset = body?.offset || 0

    // Получаем обновления
    const updates = await getUpdates(token, { offset, limit })

    if (updates.length === 0) {
      return NextResponse.json({ messages: 0, chats: 0, newOffset: offset })
    }

    let savedMessages = 0
    let savedChats = 0

    for (const update of updates) {
      // Обрабатываем сообщения
      if (update.message) {
        const msg = update.message

        // Upsert чата
        await upsertBotChat(id, {
          chatId: String(msg.chat.id),
          title: msg.chat.title,
          type: msg.chat.type,
          username: msg.chat.username,
          firstName: msg.chat.first_name,
          lastName: msg.chat.last_name,
        })
        savedChats++

        // Extract photo/document file_ids
        let photoFileId: string | undefined
        let documentFileId: string | undefined

        if (msg.photo && msg.photo.length > 0) {
          photoFileId = msg.photo[msg.photo.length - 1].file_id
        }
        if (msg.document) {
          documentFileId = msg.document.file_id
        }

        // Сохранить сообщение
        await saveIncomingMessage(id, {
          chatId: String(msg.chat.id),
          userId: String(msg.from?.id || ''),
          username: msg.from?.username || undefined,
          firstName: msg.from?.first_name || undefined,
          text: msg.text || msg.caption || undefined,
          photoFileId,
          documentFileId,
          messageId: msg.message_id,
          replyToMsgId: msg.reply_to_message?.message_id,
        })
        savedMessages++
      }

      // Обрабатываем вступление/выход бота из чатов
      if (update.my_chat_member) {
        const mcc = update.my_chat_member
        const newStatus = mcc.new_chat_member.status

        if (newStatus === 'member' || newStatus === 'administrator') {
          await upsertBotChat(id, {
            chatId: String(mcc.chat.id),
            title: mcc.chat.title,
            type: mcc.chat.type,
            username: mcc.chat.username,
          })
          savedChats++
        }
      }
    }

    // Новый offset — следующий update_id
    const newOffset = updates[updates.length - 1].update_id + 1

    return NextResponse.json({
      messages: savedMessages,
      chats: savedChats,
      newOffset,
    })
  } catch (error) {
    console.error('Poll error:', error)
    return NextResponse.json({ error: 'Failed to poll updates' }, { status: 500 })
  }
}
