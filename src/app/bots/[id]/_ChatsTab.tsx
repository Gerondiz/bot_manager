'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface BotChat {
  id: string
  botId: string
  chatId: string
  title: string | null
  type: string
  username: string | null
  firstName: string | null
  lastName: string | null
  memberCount: number | null
  firstSeen: string
  lastSeen: string
}

export default function ChatsTab({ botId }: { botId: string }) {
  const router = useRouter()
  const [chats, setChats] = useState<BotChat[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [polling, setPolling] = useState(false)
  const [pollResult, setPollResult] = useState<{ messages: number; chats: number } | null>(null)

  const fetchChats = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/bots/${botId}/chats?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setChats(data.chats || [])
      setTotal(data.total || 0)
    } catch {
      setChats([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handlePoll = async () => {
    setPolling(true)
    setPollResult(null)
    try {
      const res = await fetch(`/api/bots/${botId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPollResult({ messages: data.messages, chats: data.chats })
      // Refresh chat list
      await fetchChats()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to poll')
    } finally {
      setPolling(false)
    }
  }

  useEffect(() => { fetchChats() }, [botId, typeFilter])

  const filtered = chats.filter(c =>
    (c.title?.toLowerCase().includes(filter.toLowerCase()) ||
     c.username?.toLowerCase().includes(filter.toLowerCase()) ||
     c.chatId.includes(filter))
  )

  const typeIcons: Record<string, string> = {
    private: '👤',
    group: '👥',
    supergroup: '🏢',
    channel: '📢',
  }

  const typeColors: Record<string, string> = {
    private: 'bg-blue-50 text-blue-700',
    group: 'bg-amber-50 text-amber-700',
    supergroup: 'bg-purple-50 text-purple-700',
    channel: 'bg-sky-50 text-sky-700',
  }

  if (loading) return (
    <div className="card p-8 flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Поиск..."
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-40"
        >
          <option value="">Все типы</option>
          <option value="private">Личные</option>
          <option value="group">Группы</option>
          <option value="supergroup">Супергруппы</option>
          <option value="channel">Каналы</option>
        </select>
        <span className="text-sm text-gray-500">{total} чатов</span>
        <button
          onClick={fetchChats}
          disabled={loading}
          className="btn btn-secondary text-xs disabled:opacity-50"
          title="Обновить список"
        >
          {loading ? (
            <div className="animate-spin w-3.5 h-3.5 border-2 border-gray-600 border-t-transparent rounded-full" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          )}
        </button>
        <button
          onClick={handlePoll}
          disabled={polling}
          className="btn btn-primary text-xs disabled:opacity-50"
          title="Получить обновления из Telegram"
        >
          {polling ? (
            <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
          {polling ? 'Загрузка...' : 'Обновить из ТГ'}
        </button>
      </div>

      {pollResult && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          ✅ Получено: <strong>{pollResult.messages}</strong> сообщений, <strong>{pollResult.chats}</strong> чатов
        </div>
      )}

      {/* Chat list */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {total === 0 ? 'Чатов пока нет' : 'Ничего не найдено'}
          </h3>
          <p className="text-sm text-gray-500">
            {total === 0 ? 'Бот ещё не получал сообщений' : 'Попробуйте другой запрос'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span className="w-8" />
            <span className="flex-1">Чат</span>
            <span className="w-24">Тип</span>
            <span className="w-20">Участники</span>
            <span className="w-28">Последнее</span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {filtered.map((chat) => (
              <div
                key={chat.chatId}
                className="px-4 py-3 flex items-center gap-3 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => router.replace(`/bots/${botId}?tab=messages&chat=${chat.chatId}`)}
              >
                {/* Type icon */}
                <span className="text-lg w-8 text-center">{typeIcons[chat.type] || '💬'}</span>

                {/* Chat info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {chat.title || chat.firstName || `Chat ${chat.chatId}`}
                  </div>
                  {chat.username && (
                    <div className="text-xs text-gray-500 truncate">@{chat.username}</div>
                  )}
                </div>

                {/* Type badge */}
                <span className={`badge text-xs ${typeColors[chat.type] || 'bg-gray-50 text-gray-600'}`}>
                  {chat.type}
                </span>

                {/* Members */}
                <span className="text-xs text-gray-500 w-20 text-right">
                  {chat.memberCount ? chat.memberCount.toLocaleString() : '—'}
                </span>

                {/* Last seen */}
                <span className="text-xs text-gray-400 w-28 text-right">
                  {new Date(chat.lastSeen).toLocaleDateString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
