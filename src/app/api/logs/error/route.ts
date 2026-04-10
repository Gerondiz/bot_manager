import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/logs/error — только ошибки и критические ошибки
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    const logs = await prisma.botLog.findMany({
      where: {
        level: {
          in: ['ERROR', 'CRITICAL'],
        },
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500),
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
    console.error('Error fetching error logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    )
  }
}
