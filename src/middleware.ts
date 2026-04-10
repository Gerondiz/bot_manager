import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/health',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Пропускаем публичные пути
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Пропускаем статические файлы
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Проверяем JWT токен
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not set!')
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    jwt.verify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('auth_token')
    return response
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/bots/:path*',
    '/alice/:path*',
    '/settings/:path*',
    '/analytics/:path*',
    '/logs/:path*',
  ],
}
