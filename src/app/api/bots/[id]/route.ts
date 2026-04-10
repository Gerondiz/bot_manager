import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// GET /api/bots/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { rows } = await pool.query(
      `SELECT id, name, type, enabled, status, "lastChecked", "lastError", "tgWebhookUrl", "tgAllowGroups", "webhookUrl", "createdAt", "updatedAt",
        (SELECT COUNT(*) FROM messages WHERE "botId" = b.id) as "messageCount"
       FROM bots b WHERE b.id = $1`,
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const bot = {
      ...rows[0],
      messageCount: Number(rows[0].messageCount),
    }

    return NextResponse.json({ bot })
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

    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (name !== undefined) {
      updates.push(`name = $${idx++}`)
      values.push(name)
    }
    if (webhookUrl !== undefined) {
      updates.push(`"webhookUrl" = $${idx++}`)
      values.push(webhookUrl)
    }
    if (tgWebhookUrl !== undefined) {
      updates.push(`"tgWebhookUrl" = $${idx++}`)
      values.push(tgWebhookUrl)
    }
    if (tgAllowGroups !== undefined) {
      updates.push(`"tgAllowGroups" = $${idx++}`)
      values.push(tgAllowGroups)
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${idx++}`)
      values.push(enabled)
    }

    if (updates.length === 0) {
      // Если нет полей для обновления — вернём текущее состояние
      const { rows } = await pool.query(
        `SELECT id, name, type, enabled, "tgWebhookUrl", "tgAllowGroups", "webhookUrl", "createdAt", "updatedAt"
         FROM bots WHERE id = $1`,
        [id]
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
      }
      return NextResponse.json({ bot: rows[0] })
    }

    updates.push(`"updatedAt" = NOW()`)
    values.push(id)

    const { rows } = await pool.query(
      `UPDATE bots SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    return NextResponse.json({ bot: rows[0] })
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
    const { rowCount } = await pool.query(
      `DELETE FROM bots WHERE id = $1`,
      [id]
    )

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bot:', error)
    return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 })
  }
}
