'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'
import ChatsTab from './_ChatsTab'
import MessagesTab from './_MessagesTab'
import CommandsTab from './_CommandsTab'
import DiagnosticsTab from './_DiagnosticsTab'
import SettingsTab from './_SettingsTab'

interface Bot {
  id: string
  name: string
  type: string
  enabled: boolean
  status: string
  lastChecked: string | null
  lastError: string | null
  webhookUrl: string | null
  tgWebhookUrl: string | null
  tgAllowGroups: boolean
  token: string
}

const tabs = [
  { id: 'chats', label: 'Чаты', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  )},
  { id: 'messages', label: 'Сообщения', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )},
  { id: 'commands', label: 'Команды', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )},
  { id: 'diagnostics', label: 'Диагностика', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.412 15.655L9.75 21.75l3.745-4.012M9.257 13.5H3.75l3.562-6.187m5.303 4.937l-1.25-4.5m-4.746-2.25L6.75 2.25l3.745 4.937M16.5 12.75l3.75 6-1.5-5.25m-4.5 0h6M15 3a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
  )},
  { id: 'settings', label: 'Настройки', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
]

export default function BotPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [bot, setBot] = useState<Bot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'chats')

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/bots/${id}`, { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error('Bot not found')
          return res.json()
        })
        .then(({ bot }) => {
          setBot(bot)
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    })
  }, [params])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    params.then(({ id }) => {
      const chat = searchParams.get('chat')
      const url = chat ? `/bots/${id}?tab=${tabId}&chat=${chat}` : `/bots/${id}?tab=${tabId}`
      router.push(url, { scroll: false })
    })
  }

  if (loading) return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    </div>
  )

  if (error || !bot) return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-8 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">{error || 'Бот не найден'}</h3>
          <button onClick={() => router.push('/bots')} className="text-blue-600 hover:underline text-sm mt-2">
            ← Назад к списку
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.push('/bots')} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                bot.type === 'TELEGRAM' ? 'bg-sky-50 text-sky-600' : 'bg-purple-50 text-purple-600'
              }`}>
                {bot.type === 'TELEGRAM' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{bot.name}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{bot.type}</span>
                  <span>·</span>
                  {bot.enabled ? (
                    <span className="text-emerald-600 font-medium">Активен</span>
                  ) : (
                    <span className="text-gray-400">Отключён</span>
                  )}
                  {bot.status && bot.status !== 'unknown' && (
                    <>
                      <span>·</span>
                      <span className={`font-medium ${bot.status === 'online' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {bot.status === 'online' ? 'Online' : 'Error'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex gap-1 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === 'chats' && <ChatsTab botId={bot.id} />}
        {activeTab === 'messages' && <MessagesTab botId={bot.id} />}
        {activeTab === 'commands' && <CommandsTab botId={bot.id} token={bot.token} />}
        {activeTab === 'diagnostics' && <DiagnosticsTab bot={bot} />}
        {activeTab === 'settings' && <SettingsTab bot={bot} onBotUpdate={(b) => setBot(b)} />}
      </div>
    </div>
  )
}
