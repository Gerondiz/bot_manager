'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'

interface Bot {
  id: string
  name: string
  type: string
  enabled: boolean
  webhookUrl: string | null
  tgWebhookUrl: string | null
  tgAllowGroups: boolean
}

export default function BotEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [bot, setBot] = useState<Bot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [tgWebhookUrl, setTgWebhookUrl] = useState('')
  const [tgAllowGroups, setTgAllowGroups] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/bots/${id}`, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error('Bot not found')
          return res.json()
        })
        .then(({ bot }) => {
          setBot(bot)
          setName(bot.name)
          setWebhookUrl(bot.webhookUrl || '')
          setTgWebhookUrl(bot.tgWebhookUrl || '')
          setTgAllowGroups(bot.tgAllowGroups)
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    })
  }, [params])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const { id } = await params
      const res = await fetch(`/api/bots/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          webhookUrl: webhookUrl || null,
          tgWebhookUrl: tgWebhookUrl || null,
          tgAllowGroups,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      router.push('/bots')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Загрузка...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!bot) return <div className="p-8">Бот не найден</div>

  return (
    <div>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Настройки: {bot.name}</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Тип</label>
            <p className="text-gray-600">{bot.type}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Webhook URL (AAF)</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="https://your-aaf.example.com/webhook/v1/event"
            />
          </div>

          {bot.type === 'TELEGRAM' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Telegram Webhook URL</label>
                <input
                  type="url"
                  value={tgWebhookUrl}
                  onChange={(e) => setTgWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tgGroups"
                  checked={tgAllowGroups}
                  onChange={(e) => setTgAllowGroups(e.target.checked)}
                />
                <label htmlFor="tgGroups" className="text-sm">
                  Разрешить группы
                </label>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm">Статус:</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                bot.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {bot.enabled ? 'Активен' : 'Отключён'}
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border rounded-md hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
