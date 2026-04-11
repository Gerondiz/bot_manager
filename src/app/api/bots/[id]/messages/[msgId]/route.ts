import { NextRequest, NextResponse } from 'next/server'
import { getBotToken } from '@/lib/bots'
import { deleteMessage } from '@/lib/telegram'

// DELETE /api/bots/:id/messages/:msgId — Удалить сообщение
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const { id, msgId } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    // Get message info from DB
    const { pool } = await import('@/lib/db')
    const msgResult = await pool.query(
      'SELECT "chatId", "messageId" FROM messages WHERE id = $1 AND "botId" = $2',
      [msgId, id]
    )

    if (msgResult.rows.length > 0) {
      const { chatId, messageId } = msgResult.rows[0]
      if (messageId) {
        await deleteMessage(token, chatId, messageId)
      }
    }

    // Delete from DB
    await pool.query('DELETE FROM messages WHERE id = $1 AND "botId" = $2', [msgId, id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
