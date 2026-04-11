'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/ui/Navbar'

interface LogEntry {
  id: string
  botId: string | null
  botName?: string
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  message: string
  context: Record<string, unknown> | null
  timestamp: string
}

const LEVEL_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  INFO: { badge: 'badge-neutral', dot: 'bg-gray-400', label: 'INFO' },
  WARNING: { badge: 'badge-warning', dot: 'bg-amber-400', label: 'WARN' },
  ERROR: { badge: 'badge-error', dot: 'bg-red-500', label: 'ERROR' },
  CRITICAL: { badge: 'badge-error', dot: 'bg-red-600', label: 'CRIT' },
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'только что'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = async (level?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (level && level !== 'all') params.set('level', level)
      params.set('limit', '200')

      const res = await fetch(`/api/logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs(filterLevel) }, [filterLevel])

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Логи</h1>
          <div className="flex items-center gap-3">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="input py-1.5 px-3 text-sm"
            >
              <option value="all">Все уровни</option>
              <option value="ERROR">Только ошибки</option>
              <option value="CRITICAL">Критические</option>
              <option value="WARNING">Предупреждения</option>
              <option value="INFO">Информация</option>
            </select>
            <button
              onClick={() => fetchLogs(filterLevel)}
              className="btn btn-secondary p-2"
              title="Обновить"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card px-4 py-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-5 bg-gray-200 rounded" />
                  <div className="w-20 h-4 bg-gray-200 rounded" />
                  <div className="flex-1 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Логи отсутствуют</h3>
            <p className="text-sm text-gray-500">Записи появятся при работе ботов</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const level = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.INFO
                const isExpanded = expandedId === log.id
                return (
                  <div key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <div
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                      onClick={() => log.context && setExpandedId(isExpanded ? null : log.id)}
                    >
                      {/* Level badge */}
                      <span className={`badge ${level.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${level.dot}`} />
                        {level.label}
                      </span>

                      {/* Bot name or system */}
                      <span className="text-xs font-mono text-gray-500 w-36 truncate flex-shrink-0">
                        {log.botId ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
                            </svg>
                            {log.botId.slice(0, 8)}
                          </span>
                        ) : (
                          <span className="text-gray-400">система</span>
                        )}
                      </span>

                      {/* Message */}
                      <span className="text-sm text-gray-700 flex-1 truncate font-mono">{log.message}</span>

                      {/* Time */}
                      <span className="text-xs text-gray-400 whitespace-nowrap" title={new Date(log.timestamp).toLocaleString('ru-RU')}>
                        {timeAgo(log.timestamp)}
                      </span>

                      {/* Expand indicator */}
                      {log.context && (
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      )}
                    </div>

                    {/* Expanded context */}
                    {isExpanded && log.context && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                        <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
