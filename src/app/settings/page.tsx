'use client'

import { useState } from 'react'
import Navbar from '@/components/ui/Navbar'

export default function SettingsPage() {
  const [copied, setCopied] = useState(false)

  const aafWebhookUrl = process.env.NEXT_PUBLIC_AAF_WEBHOOK_URL || 'https://your-aaf.example.com/webhook/v1/event'

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="page-header">
          <h1 className="page-title">Настройки</h1>
        </div>

        <div className="space-y-6">
          {/* AAF Integration */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Интеграция с qwen_aaf</h2>
                <p className="text-sm text-gray-500">Webhook URL для отправки событий</p>
              </div>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-mono text-gray-700 truncate">
                {aafWebhookUrl}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aafWebhookUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className={`btn flex-shrink-0 ${copied ? 'btn-secondary text-emerald-600' : 'btn-secondary'}`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Скопировано
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Копировать
                  </>
                )}
              </button>
            </div>
          </div>

          {/* API Keys - placeholder */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">API ключи</h2>
                <p className="text-sm text-gray-500">Управление ключами для внешних сервисов</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.412 15.655L9.75 21.75l3.745-4.012M9.257 13.5H3.75l2.659-2.849m2.045 4.342L3.75 21.75l5.56-2.045M12 12V3.75m0 0L9.75 6.75m0 0L14.25 3.75M9.75 6.75L12 3.75" />
              </svg>
              <span className="text-sm text-amber-700 font-medium">В разработке — генерация и управление ключами</span>
            </div>
          </div>

          {/* Version info */}
          <div className="text-center pt-8">
            <p className="text-xs text-gray-400">Bot Manager v0.1.0 · Next.js 15</p>
          </div>
        </div>
      </div>
    </div>
  )
}
