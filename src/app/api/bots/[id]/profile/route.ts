import { NextRequest, NextResponse } from 'next/server'
import { getBotToken } from '@/lib/bots'
import {
  getMyName, setMyName,
  getMyDescription, setMyDescription,
  getMyShortDescription, setMyShortDescription,
} from '@/lib/telegram'

// GET /api/bots/:id/profile — Информация о профиле бота
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const [name, description, shortDescription] = await Promise.all([
      getMyName(token),
      getMyDescription(token),
      getMyShortDescription(token),
    ])

    return NextResponse.json({ profile: { name, description, shortDescription } })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}

// PATCH /api/bots/:id/profile — Обновить профиль бота
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, shortDescription } = body

    const token = await getBotToken(id)
    if (!token) return NextResponse.json({ error: 'Bot not found' }, { status: 404 })

    const results: { name?: boolean; description?: boolean; shortDescription?: boolean } = {}

    if (name !== undefined) {
      results.name = await setMyName(token, name)
    }
    if (description !== undefined) {
      results.description = await setMyDescription(token, description)
    }
    if (shortDescription !== undefined) {
      results.shortDescription = await setMyShortDescription(token, shortDescription)
    }

    const failed = Object.entries(results).find(([, ok]) => !ok)
    if (failed) {
      return NextResponse.json(
        { error: `Failed to update ${failed[0]}`, results },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, profile: { name, description, shortDescription } })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
