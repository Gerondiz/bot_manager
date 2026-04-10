import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, type, enabled, "createdAt",
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
      `INSERT INTO bots (name, type, token, "webhookUrl", "tgAllowGroups")
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, type, token, webhookUrl || null, tgAllowGroups || false]
    )

    return NextResponse.json({ bot: rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating bot:', error)
    return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 })
  }
}
