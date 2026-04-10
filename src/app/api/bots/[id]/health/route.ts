import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { checkBotHealth, checkWebhookStatus } from '@/lib/telegram'

// POST /api/bots/:id/health
// Проверяет работоспособность бота через Telegram Bot API (getMe + getWebhookInfo)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Получаем бота с токеном
    const { rows } = await pool.query(
      `SELECT id, name, type, token, enabled, "webhookUrl" FROM bots WHERE id = $1`,
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const bot = rows[0]

    if (bot.type !== 'TELEGRAM') {
      return NextResponse.json({ error: 'Health check only supported for Telegram bots' }, { status: 400 })
    }

    // Проверка здоровья бота (getMe)
    const healthResult = await checkBotHealth(bot.token)

    // Проверка webhook статуса
    const webhookResult = await checkWebhookStatus(bot.token)

    // Обновляем статус бота в БД
    const status = healthResult.healthy ? 'online' : 'error'
    const lastError = healthResult.error || null

    await pool.query(
      `UPDATE bots SET status = $1, "lastChecked" = NOW(), "lastError" = $2, "updatedAt" = NOW() WHERE id = $3`,
      [status, lastError, id]
    )

    return NextResponse.json({
      health: healthResult,
      webhook: webhookResult,
      bot: {
        id: bot.id,
        name: bot.name,
        status,
        lastChecked: new Date().toISOString(),
        lastError,
      },
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}

// GET /api/bots/:id/health
// Возвращает последний результат проверки здоровья
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { rows } = await pool.query(
      `SELECT id, name, status, "lastChecked", "lastError" FROM bots WHERE id = $1`,
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const bot = rows[0]

    return NextResponse.json({
      health: {
        botId: bot.id,
        name: bot.name,
        status: bot.status || 'unknown',
        lastChecked: bot.lastChecked,
        lastError: bot.lastError,
      },
    })
  } catch (error) {
    console.error('Health check fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch health status' }, { status: 500 })
  }
}
