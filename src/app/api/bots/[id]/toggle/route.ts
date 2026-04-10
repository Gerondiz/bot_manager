import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/bots/:id/toggle
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bot = await db.bot.findUnique({ where: { id } })
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const updated = await db.bot.update({
      where: { id },
      data: { enabled: !bot.enabled },
    })

    return NextResponse.json({ bot: updated })
  } catch (error) {
    console.error('Error toggling bot:', error)
    return NextResponse.json({ error: 'Failed to toggle bot' }, { status: 500 })
  }
}
