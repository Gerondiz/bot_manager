'use client'

import { useEffect, useState } from 'react'

interface LogEntry {
  id: string
  botId: string
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  message: string
  context: Record<string, unknown> | null
  timestamp: string
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: 'text-gray-600',
  WARNING: 'text-yellow-600',
  ERROR: 'text-red-600',
  CRITICAL: 'text-red-800 font-bold',
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async (level?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (level && level !== 'all') params.set('level', level)
      params.set('limit', '100')

      const res = await fetch(`/api/logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(filterLevel)
  }, [filterLevel])

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Логи системы</h1>
        <div className="flex gap-2">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">Все уровни</option>
            <option value="ERROR">Только ошибки</option>
            <option value="CRITICAL">Критические</option>
            <option value="WARNING">Предупреждения</option>
            <option value="INFO">Информация</option>
          </select>
          <button
            onClick={() => fetchLogs(filterLevel)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Уровень</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Бот</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сообщение</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Логи отсутствуют
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(log.timestamp).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${LEVEL_COLORS[log.level]}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{log.botId.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm font-mono">{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
