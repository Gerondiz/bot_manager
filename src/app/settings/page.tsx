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
        <h1 className="text-3xl font-bold mb-6">Настройки</h1>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Интеграция с qwen_aaf</h2>
            <p className="text-sm text-gray-600 mb-2">
              Настройте webhook URL для отправки событий в AAF систему.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                {aafWebhookUrl}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aafWebhookUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="px-3 py-2 border rounded hover:bg-gray-50 text-sm"
              >
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">API ключи</h2>
            <p className="text-sm text-gray-600 mb-2">
              API ключи используются для аутентификации внешних сервисов.
            </p>
            <p className="text-sm text-yellow-600">
              В разработке — генерация и управление ключами
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
