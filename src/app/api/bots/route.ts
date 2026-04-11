import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { setWebhook } from '@/lib/telegram'

/**
 * Получить базовый URL для webhook Telegram
 * Приоритет: WEBHOOK_BASE_URL > VERCEL_URL > хост из запроса
 */
function getWebhookBaseUrl(req?: Request): string {
  if (process.env.WEBHOOK_BASE_URL) return process.env.WEBHOOK_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  // Fallback: пытаемся извлечь из запроса
  const host = req?.headers?.get('host')
  if (host) {
    if (host.includes('localhost')) return `http://${host}`
    return `https://${host}`
  }
  return ''
}

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, type, enabled, status, "lastChecked", "lastError", "createdAt",
        (SELECT COUNT(*) FROM messages WHERE "botId" = b.id) as "messageCount"
      FROM bots b
      ORDER BY "createdAt" DESC
    `)
    return NextResponse.json({ bots: rows })
  } catch (error) {
    console.error('Error fetching bots:', error)
    return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, type, token, webhookUrl, tgAllowGroups, tgAllowedGroups } = body

    if (!name || !type || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { rows } = await pool.query(
      `INSERT INTO bots (id, name, type, token, "webhookUrl", "tgAllowGroups", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [name, type, token, webhookUrl || null, tgAllowGroups || false]
    )

    const bot = rows[0]

    // Автоматическая установка webhook Telegram для Telegram ботов
    if (type === 'TELEGRAM') {
      const webhookBase = getWebhookBaseUrl(request)
      if (webhookBase) {
        const tgWebhookUrl = `${webhookBase}/api/webhook/telegram/${bot.id}`
        try {
          const success = await setWebhook(token, tgWebhookUrl)
          if (success) {
            await pool.query(
              `UPDATE bots SET "tgWebhookUrl" = $1 WHERE id = $2`,
              [tgWebhookUrl, bot.id]
            )
            bot.tgWebhookUrl = tgWebhookUrl
          } else {
            console.warn(`[Bot ${bot.id}] Failed to set Telegram webhook: ${tgWebhookUrl}`)
          }
        } catch (err) {
          console.error(`[Bot ${bot.id}] Error setting Telegram webhook:`, err)
        }
      } else {
        console.warn(`[Bot ${bot.id}] WEBHOOK_BASE_URL or VERCEL_URL not set, skipping webhook setup`)
      }
    }

    return NextResponse.json({ bot }, { status: 201 })
  } catch (error) {
    console.error('Error creating bot:', error)
    return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 })
  }
}
