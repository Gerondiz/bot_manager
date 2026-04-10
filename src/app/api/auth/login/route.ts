import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme'
const JWT_SECRET = process.env.JWT_SECRET

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { login, password } = body

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Login and password required' },
        { status: 400 }
      )
    }

    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables!')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Простая проверка логина/пароля из env
    if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Создаём JWT токен
    const token = jwt.sign(
      { login, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    const response = NextResponse.json({ success: true })
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
