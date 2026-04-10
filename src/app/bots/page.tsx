'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

interface Bot {
  id: string
  name: string
  type: string
  enabled: boolean
  createdAt: string
  messageCount: number
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBots = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/bots', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch bots')
      const data = await res.json()
      setBots(data.bots)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBots()
  }, [])

  const handleToggle = async (bot: Bot) => {
    try {
      const res = await fetch(`/api/bots/${bot.id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to toggle bot')
      fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleDelete = async (botId: string) => {
    if (!confirm('Удалить бота? Это действие необратимо.')) return
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete bot')
      fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Управление ботами</h1>
          <Link
            href="/bots/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Новый бот
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">Ботов пока нет</p>
            <Link
              href="/bots/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Создать первого бота
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-white rounded-lg shadow p-6 flex items-center justify-between"
              >
                <div>
                  <h2 className="text-lg font-semibold">{bot.name}</h2>
                  <p className="text-sm text-gray-500">
                    {bot.type} · {bot.messageCount} сообщений · Создан{' '}
                    {new Date(bot.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      bot.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {bot.enabled ? 'Активен' : 'Отключён'}
                  </span>
                  <Link
                    href={`/bots/${bot.id}`}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    Настроить
                  </Link>
                  <button
                    onClick={() => handleToggle(bot)}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    {bot.enabled ? 'Отключить' : 'Включить'}
                  </button>
                  <button
                    onClick={() => handleDelete(bot.id)}
                    className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
