import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (level && level !== 'all') {
      where.level = level
    }

    const logs = await prisma.botLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500),
      skip: offset,
      include: {
        bot: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        botId: log.botId,
        botName: log.bot?.name ?? 'system',
        level: log.level,
        message: log.message,
        context: log.context,
        timestamp: log.timestamp.toISOString(),
      })),
      total: logs.length,
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
