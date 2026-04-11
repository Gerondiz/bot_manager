'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Message {
  id: string
  botId: string
  chatId: string
  userId: string
  username: string | null
  firstName: string | null
  direction: 'INCOMING' | 'OUTGOING'
  text: string | null
  photoFileId: string | null
  documentFileId: string | null
  messageId: number | null
  replyToMsgId: number | null
  timestamp: string
}

interface BotChat {
  chatId: string
  title?: string
  username?: string
  firstName?: string
}

export default function MessagesTab({ botId }: { botId: string }) {
  const searchParams = useSearchParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chats, setChats] = useState<BotChat[]>([])
  const [selectedChatId, setSelectedChatId] = useState(searchParams.get('chat') || '')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [total, setTotal] = useState(0)
  const [directionFilter, setDirectionFilter] = useState('')

  const fetchMessages = async () => {
    if (!selectedChatId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ chatId: selectedChatId, limit: '100' })
      if (directionFilter) params.set('direction', directionFilter)
      const res = await fetch(`/api/bots/${botId}/messages?${params}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMessages((data.messages || []).reverse())
      setTotal(data.total || 0)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const fetchChats = async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/chats?limit=200`)
      if (!res.ok) return
      const data = await res.json()
      setChats(data.chats || [])
    } catch {}
  }

  useEffect(() => { fetchChats() }, [botId])
  useEffect(() => { fetchMessages() }, [botId, selectedChatId, directionFilter])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !selectedChatId) return
    setSending(true)
    try {
      const res = await fetch(`/api/bots/${botId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChatId, text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setText('')
      fetchMessages()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const selectedChat = chats.find(c => c.chatId === selectedChatId)

  if (!selectedChatId) {
    return (
      <div className="card p-12 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.356.026.67.21.87.504l2.1 3.06a.75.75 0 001.24 0l2.1-3.06a1.125 1.125 0 01.87-.504 48.42 48.42 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.14 48.14 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">Выберите чат</h3>
        <p className="text-sm text-gray-500">Выберите чат из списка во вкладке «Чаты»</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat selector + info */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <select
          value={selectedChatId}
          onChange={(e) => setSelectedChatId(e.target.value)}
          className="input flex-1"
        >
          <option value="">Выберите чат...</option>
          {chats.map(c => (
            <option key={c.chatId} value={c.chatId}>
              {c.title || c.firstName || `Chat ${c.chatId}`} {c.username ? `(@${c.username})` : ''}
            </option>
          ))}
        </select>
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className="input w-36"
        >
          <option value="">Все</option>
          <option value="INCOMING">Входящие</option>
          <option value="OUTGOING">Исходящие</option>
        </select>
        <span className="text-xs text-gray-500">{total} сообщ.</span>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">Нет сообщений</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                msg.direction === 'OUTGOING'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
              }`}>
                {msg.text && <div className="break-words">{msg.text}</div>}
                {msg.photoFileId && <div className="text-xs opacity-75">📷 Фото</div>}
                {msg.documentFileId && <div className="text-xs opacity-75">📎 Документ</div>}
                <div className={`text-[10px] mt-1 text-right ${
                  msg.direction === 'OUTGOING' ? 'text-blue-200' : 'text-gray-400'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите сообщение..."
          className="input flex-1"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="btn btn-primary px-4 py-2 disabled:opacity-50"
        >
          {sending ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
