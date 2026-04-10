import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const bots = await db.bot.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        createdAt: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      bots: bots.map((b) => ({
        ...b,
        messageCount: b._count.messages,
        _count: undefined,
      })),
    })
  } catch (error) {
    console.error('Error fetching bots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bots' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, type, token, webhookUrl, tgAllowGroups, tgAllowedGroups } = body

    if (!name || !type || !token) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, token' },
        { status: 400 }
      )
    }

    // TODO: Encrypt token before saving
    const bot = await db.bot.create({
      data: {
        name,
        type,
        token,
        webhookUrl,
        tgAllowGroups: tgAllowGroups || false,
        tgAllowedGroups: Array.isArray(tgAllowedGroups) ? tgAllowedGroups : [],
      },
    })

    return NextResponse.json({ bot }, { status: 201 })
  } catch (error) {
    console.error('Error creating bot:', error)
    return NextResponse.json(
      { error: 'Failed to create bot' },
      { status: 500 }
    )
  }
}
