import { NextRequest, NextResponse } from 'next/server'

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

  // Проверяем наличие токена (полная верификация на сервере через API route)
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Пропускаем запрос — полная JWT верификация происходит в защищённых API routes
  return NextResponse.next()
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
