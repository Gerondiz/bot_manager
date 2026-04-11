import { NextRequest, NextResponse } from 'next/server'
import { getBotToken, upsertBotChat } from '@/lib/bots'
import { getChatInfo, getChatMemberCount } from '@/lib/telegram'

// GET /api/bots/:id/chats/:chatId — Информация о чате (свежая из Telegram API)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  try {
    const { id, chatId } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const decodedChatId = decodeURIComponent(chatId)
    const chatInfo = await getChatInfo(token, decodedChatId)
    if (!chatInfo) {
      return NextResponse.json({ error: 'Chat not found in Telegram' }, { status: 404 })
    }

    // Upsert local cache
    await upsertBotChat(id, {
      chatId: String(chatInfo.id),
      title: chatInfo.title,
      type: chatInfo.type,
      username: chatInfo.username,
      firstName: chatInfo.first_name,
      lastName: chatInfo.last_name,
      memberCount: chatInfo.member_count,
    })

    return NextResponse.json({ chat: chatInfo })
  } catch (error) {
    console.error('Get chat info error:', error)
    return NextResponse.json({ error: 'Failed to get chat info' }, { status: 500 })
  }
}

// POST /api/bots/:id/chats/:chatId/refresh — Обновить данные чата из Telegram
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  try {
    const { id, chatId } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const decodedChatId = decodeURIComponent(chatId)
    const chatInfo = await getChatInfo(token, decodedChatId)
    if (!chatInfo) {
      return NextResponse.json({ error: 'Chat not found in Telegram' }, { status: 404 })
    }

    // Update member count
    const memberCount = await getChatMemberCount(token, decodedChatId)

    await upsertBotChat(id, {
      chatId: String(chatInfo.id),
      title: chatInfo.title,
      type: chatInfo.type,
      username: chatInfo.username,
      firstName: chatInfo.first_name,
      lastName: chatInfo.last_name,
      memberCount,
    })

    return NextResponse.json({ chat: { ...chatInfo, member_count: memberCount } })
  } catch (error) {
    console.error('Refresh chat error:', error)
    return NextResponse.json({ error: 'Failed to refresh chat' }, { status: 500 })
  }
}
