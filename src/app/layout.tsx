import './globals.css'
import type { Metadata } from 'next'
import { errorLogger } from '@/lib/error-logger'

// Инициализируем логирование ошибок
if (typeof window === 'undefined') {
  errorLogger()
}

export const metadata: Metadata = {
  title: 'Bot Manager',
  description: 'Telegram Bot Manager — управление ботами и навыками Алисы',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
