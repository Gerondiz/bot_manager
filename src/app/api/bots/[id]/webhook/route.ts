import { NextRequest, NextResponse } from 'next/server'
import { getBotToken } from '@/lib/bots'
import { setWebhook, deleteWebhook, checkWebhookStatus } from '@/lib/telegram'

// GET /api/bots/:id/webhook — Текущий статус webhook
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const webhook = await checkWebhookStatus(token)
    return NextResponse.json({ webhook })
  } catch (error) {
    console.error('Get webhook error:', error)
    return NextResponse.json({ error: 'Failed to get webhook info' }, { status: 500 })
  }
}

// POST /api/bots/:id/webhook — Установить webhook URL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const success = await setWebhook(token, url)
    if (!success) {
      return NextResponse.json({ error: 'Failed to set webhook' }, { status: 500 })
    }

    // Update DB
    const { pool } = await import('@/lib/db')
    await pool.query('UPDATE bots SET "tgWebhookUrl" = $1 WHERE id = $2', [url, id])

    return NextResponse.json({ success: true, webhook: { url } })
  } catch (error) {
    console.error('Set webhook error:', error)
    return NextResponse.json({ error: 'Failed to set webhook' }, { status: 500 })
  }
}

// DELETE /api/bots/:id/webhook — Удалить webhook
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const success = await deleteWebhook(token)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
    }

    // Update DB
    const { pool } = await import('@/lib/db')
    await pool.query('UPDATE bots SET "tgWebhookUrl" = NULL WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete webhook error:', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}
