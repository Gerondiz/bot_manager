import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// POST /api/bots/:id/toggle
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Сначала получаем текущее состояние
    const { rows } = await pool.query(
      `SELECT enabled FROM bots WHERE id = $1`,
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const updated = await pool.query(
      `UPDATE bots SET enabled = NOT enabled, "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
      [id]
    )

    return NextResponse.json({ bot: updated.rows[0] })
  } catch (error) {
    console.error('Error toggling bot:', error)
    return NextResponse.json({ error: 'Failed to toggle bot' }, { status: 500 })
  }
}
