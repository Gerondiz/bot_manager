'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'

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
}

interface HealthResult {
  healthy: boolean
  botInfo?: {
    id: number
    first_name: string
    username: string
    can_join_groups: boolean
    can_read_all_group_messages: boolean
  }
  error?: string
  checkedAt: string
}

interface WebhookResult {
  url?: string
  has_custom_certificate?: boolean
  pending_update_count?: number
  last_error_date?: number
  last_error_message?: string
  max_connections?: number
  error?: string
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

  // Health check state
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null)
  const [webhookResult, setWebhookResult] = useState<WebhookResult | null>(null)

  // Test message state
  const [chatId, setChatId] = useState('')
  const [testText, setTestText] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; error?: string } | null>(null)

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

  const handleHealthCheck = async () => {
    setCheckingHealth(true)
    setHealthResult(null)
    setWebhookResult(null)
    setTestResult(null)

    try {
      const { id } = await params
      const res = await fetch(`/api/bots/${id}/health`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Health check failed')

      setHealthResult(data.health)
      setWebhookResult(data.webhook)
      // Refresh bot info
      setBot(prev => prev ? { ...prev, status: data.bot.status, lastChecked: data.bot.lastChecked, lastError: data.bot.lastError } : prev)
    } catch (err) {
      setHealthResult({ healthy: false, error: err instanceof Error ? err.message : 'Unknown error', checkedAt: new Date().toISOString() })
    } finally {
      setCheckingHealth(false)
    }
  }

  const handleTestMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatId.trim()) return

    setSendingTest(true)
    setTestResult(null)

    try {
      const { id } = await params
      const res = await fetch(`/api/bots/${id}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chatId.trim(), text: testText || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send')

      setTestResult({ success: true, message: data.message || 'Message sent', error: undefined })
      setChatId('')
      setTestText('')
    } catch (err) {
      setTestResult({ success: false, message: '', error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setSendingTest(false)
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

        {/* ─── Health Check & Test Tools ─── */}
        {bot.type === 'TELEGRAM' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-6">
            <h2 className="text-xl font-semibold">🔧 Диагностика</h2>

            {/* Health Check */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Проверка здоровья</h3>
                <button
                  onClick={handleHealthCheck}
                  disabled={checkingHealth}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {checkingHealth ? 'Проверка...' : 'Проверить'}
                </button>
              </div>

              {healthResult && (
                <div className={`p-3 rounded-md text-sm ${healthResult.healthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="font-medium mb-1">
                    {healthResult.healthy ? '✅ Бот работает' : '❌ Ошибка'}
                  </div>
                  {healthResult.botInfo && (
                    <div className="text-gray-600 space-y-1 mt-2">
                      <div><span className="font-medium">@{healthResult.botInfo.username}</span> ({healthResult.botInfo.first_name})</div>
                      <div>ID: {healthResult.botInfo.id}</div>
                      <div>Группы: {healthResult.botInfo.can_join_groups ? 'Да' : 'Нет'}</div>
                    </div>
                  )}
                  {healthResult.error && (
                    <div className="text-red-700 mt-2 font-mono text-xs">{healthResult.error}</div>
                  )}
                  <div className="text-gray-400 text-xs mt-2">
                    {new Date(healthResult.checkedAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              )}

              {webhookResult && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                  <div className="font-medium mb-1">Webhook</div>
                  {webhookResult.url ? (
                    <div className="text-gray-600 break-all font-mono text-xs">{webhookResult.url}</div>
                  ) : (
                    <div className="text-gray-400">Не установлен</div>
                  )}
                  {webhookResult.pending_update_count !== undefined && webhookResult.pending_update_count > 0 && (
                    <div className="text-amber-600 mt-1">⏳ Ожидает: {webhookResult.pending_update_count}</div>
                  )}
                  {webhookResult.last_error_message && (
                    <div className="text-red-600 mt-1 text-xs">⚠️ {webhookResult.last_error_message}</div>
                  )}
                  {webhookResult.error && (
                    <div className="text-red-600 mt-1 text-xs font-mono">{webhookResult.error}</div>
                  )}
                </div>
              )}

              {/* Last check info from DB */}
              {bot.status && bot.status !== 'unknown' && !healthResult && (
                <div className="text-xs text-gray-400 mt-1">
                  Последний статус: <span className={`font-medium ${bot.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>{bot.status === 'online' ? 'online' : bot.status}</span>
                  {bot.lastChecked && <> · {new Date(bot.lastChecked).toLocaleString('ru-RU')}</>}
                  {bot.lastError && <div className="text-red-500 mt-1 font-mono">{bot.lastError}</div>}
                </div>
              )}
            </div>

            {/* Test Message */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Тестовое сообщение</h3>
              {testResult && (
                <div className={`mb-3 p-3 rounded-md text-sm ${testResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {testResult.success ? `✅ ${testResult.message}` : `❌ ${testResult.error}`}
                </div>
              )}
              <form onSubmit={handleTestMessage} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Chat ID</label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="Ваш числовой ID (найдите через @userinfobot)"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Текст (необязательно)</label>
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="Оставьте пустым для стандартного теста"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingTest || !chatId.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {sendingTest ? 'Отправка...' : 'Отправить тест'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── Bot Settings Form ─── */}
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

          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm">Статус:</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                bot.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {bot.enabled ? 'Активен' : 'Отключён'}
            </span>
            {bot.status && bot.status !== 'unknown' && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  bot.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {bot.status === 'online' ? '🟢 Online' : '🔴 Error'}
              </span>
            )}
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
