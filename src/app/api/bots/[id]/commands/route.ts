import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { getBotToken } from '@/lib/bots'
import { getMyCommands, setMyCommands, deleteMyCommands, type BotCommand } from '@/lib/telegram'

// GET /api/bots/:id/commands — Получить список команд бота
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const commands = await getMyCommands(token)
    return NextResponse.json({ commands })
  } catch (error) {
    console.error('Get commands error:', error)
    return NextResponse.json({ error: 'Failed to get commands' }, { status: 500 })
  }
}

// POST /api/bots/:id/commands — Установить команды бота
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { commands } = body as { commands: BotCommand[] }

    if (!commands || !Array.isArray(commands)) {
      return NextResponse.json({ error: 'commands array required' }, { status: 400 })
    }

    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const success = await setMyCommands(token, commands)
    if (!success) {
      return NextResponse.json({ error: 'Failed to set commands' }, { status: 500 })
    }

    return NextResponse.json({ success: true, commands })
  } catch (error) {
    console.error('Set commands error:', error)
    return NextResponse.json({ error: 'Failed to set commands' }, { status: 500 })
  }
}

// DELETE /api/bots/:id/commands — Удалить все команды бота
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const success = await deleteMyCommands(token)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete commands' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete commands error:', error)
    return NextResponse.json({ error: 'Failed to delete commands' }, { status: 500 })
  }
}
