import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/bots/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bot = await prisma.bot.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        tgWebhookUrl: true,
        tgAllowGroups: true,
        webhookUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    return NextResponse.json({ bot: { ...bot, messageCount: bot._count.messages } })
  } catch (error) {
    console.error('Error fetching bot:', error)
    return NextResponse.json({ error: 'Failed to fetch bot' }, { status: 500 })
  }
}

// PATCH /api/bots/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, webhookUrl, tgWebhookUrl, tgAllowGroups, enabled } = body

    const bot = await prisma.bot.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(tgWebhookUrl !== undefined && { tgWebhookUrl }),
        ...(tgAllowGroups !== undefined && { tgAllowGroups }),
        ...(enabled !== undefined && { enabled }),
      },
    })

    return NextResponse.json({ bot })
  } catch (error) {
    console.error('Error updating bot:', error)
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 })
  }
}

// DELETE /api/bots/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.bot.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bot:', error)
    return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 })
  }
}
