import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { errorLogger } from '@/lib/error-logger'

if (typeof window === 'undefined') {
  errorLogger()
}

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

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
    <html lang="ru" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  )
}
