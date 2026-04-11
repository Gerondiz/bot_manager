'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

interface Stats {
  totalBots: number
  enabledBots: number
  totalMessages: number
  totalErrors: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalBots: 0, enabledBots: 0, totalMessages: 0, totalErrors: 0 })
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState<string>('')

  useEffect(() => {
    Promise.all([
      fetch('/api/bots').then(r => r.json()),
      fetch('/api/logs?limit=5').then(r => r.json()),
    ]).then(([botsData, logsData]) => {
      const bots = botsData.bots || []
      const totalMessages = bots.reduce((sum: number, b: any) => sum + parseInt(b.messageCount || '0'), 0)
      setStats({
        totalBots: bots.length,
        enabledBots: bots.filter((b: any) => b.enabled).length,
        totalMessages,
        totalErrors: logsData.logs?.filter((l: any) => l.level === 'ERROR' || l.level === 'CRITICAL').length || 0,
      })
      setRecentLogs(logsData.logs?.slice(0, 5) || [])
      setUpdated(new Date().toLocaleTimeString('ru-RU'))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const cards = [
    {
      label: 'Всего ботов',
      value: stats.totalBots,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
        </svg>
      ),
      color: 'blue',
      href: '/bots',
    },
    {
      label: 'Активных',
      value: stats.enabledBots,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'emerald',
      href: '/bots',
    },
    {
      label: 'Сообщений',
      value: stats.totalMessages,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      ),
      color: 'violet',
      href: '/logs',
    },
    {
      label: 'Ошибок',
      value: stats.totalErrors,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      color: stats.totalErrors > 0 ? 'red' : 'gray',
      href: '/logs',
    },
  ]

  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-600' },
    gray: { bg: 'bg-gray-50', icon: 'text-gray-400' },
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            {updated && <p className="text-sm text-gray-500 mt-0.5">Обновлено в {updated}</p>}
          </div>
          <Link href="/bots/new" className="btn btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Новый бот
          </Link>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                    <div className="h-8 bg-gray-200 rounded w-12" />
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
              const colors = colorMap[card.color]
              return (
                <Link key={card.label} href={card.href} className="card card-hover p-6 block">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{card.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '—' : card.value}</p>
                    </div>
                    <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center ${colors.icon}`}>
                      {card.icon}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Последние события</h2>
            <Link href="/logs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Все логи →
            </Link>
          </div>
          <div className="card overflow-hidden">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Событий пока нет
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentLogs.map((log) => {
                  const levelColors: Record<string, string> = {
                    INFO: 'bg-gray-100 text-gray-600',
                    WARNING: 'bg-amber-50 text-amber-700',
                    ERROR: 'bg-red-50 text-red-700',
                    CRITICAL: 'bg-red-100 text-red-800 font-bold',
                  }
                  return (
                    <div key={log.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                      <span className={`badge ${levelColors[log.level]}`}>{log.level}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{log.message}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
