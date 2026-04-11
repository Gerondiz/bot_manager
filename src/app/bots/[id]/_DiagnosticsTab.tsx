'use client'

import { useState } from 'react'

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

interface HistoryEntry {
  id: string
  botId: string
  healthy: boolean
  status: string
  error: string | null
  checkedAt: string
}

export default function DiagnosticsTab({ bot }: { bot: Bot }) {
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [healthResult, setHealthResult] = useState<HealthResult | null>(null)
  const [webhookResult, setWebhookResult] = useState<WebhookResult | null>(null)
  const [chatId, setChatId] = useState('')
  const [testText, setTestText] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; error?: string } | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const handleHealthCheck = async () => {
    setCheckingHealth(true)
    setHealthResult(null)
    setWebhookResult(null)
    setTestResult(null)

    try {
      const res = await fetch(`/api/bots/${bot.id}/health`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Health check failed')

      setHealthResult(data.health)
      setWebhookResult(data.webhook)
    } catch (err) {
      setHealthResult({ healthy: false, error: err instanceof Error ? err.message : 'Unknown error', checkedAt: new Date().toISOString() })
    } finally {
      setCheckingHealth(false)
      fetchHistory()
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/bots/${bot.id}/health/history?limit=20`)
      if (!res.ok) return
      const data = await res.json()
      setHistory(data.history || [])
    } catch {}
  }

  const handleTestMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatId.trim()) return

    setSendingTest(true)
    setTestResult(null)

    try {
      const res = await fetch(`/api/bots/${bot.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chatId.trim(), text: testText || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send')

      setTestResult({ success: true, message: data.message || 'Message sent' })
      setChatId('')
      setTestText('')
    } catch (err) {
      setTestResult({ success: false, message: '', error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Health Check */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Проверка здоровья</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleHealthCheck}
              disabled={checkingHealth}
              className="btn btn-secondary text-sm disabled:opacity-50"
            >
              {checkingHealth ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              )}
              {checkingHealth ? 'Проверка...' : 'Проверить'}
            </button>
            <button
              onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory() }}
              className="btn btn-ghost text-sm text-gray-500"
            >
              История
            </button>
          </div>
        </div>

        {healthResult && (
          <div className={`p-4 rounded-lg text-sm ${healthResult.healthy ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="font-semibold mb-2">
              {healthResult.healthy ? '✅ Бот работает' : '❌ Ошибка'}
            </div>
            {healthResult.botInfo && (
              <div className="text-gray-600 space-y-1">
                <div><span className="font-medium">@{healthResult.botInfo.username}</span> ({healthResult.botInfo.first_name})</div>
                <div>ID: {healthResult.botInfo.id}</div>
                <div>Группы: {healthResult.botInfo.can_join_groups ? 'Да' : 'Нет'}</div>
              </div>
            )}
            {healthResult.error && (
              <div className="text-red-700 mt-2 font-mono text-xs bg-red-100 px-3 py-2 rounded">{healthResult.error}</div>
            )}
          </div>
        )}

        {webhookResult && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
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
          </div>
        )}

        {/* Last check from DB */}
        {bot.status && bot.status !== 'unknown' && !healthResult && (
          <div className="text-sm text-gray-500">
            Последний статус: <span className={`font-medium ${bot.status === 'online' ? 'text-emerald-600' : 'text-red-600'}`}>
              {bot.status === 'online' ? '🟢 online' : '🔴 error'}
            </span>
            {bot.lastChecked && <span className="ml-2">{new Date(bot.lastChecked).toLocaleString('ru-RU')}</span>}
            {bot.lastError && <div className="text-red-500 text-xs mt-1 font-mono">{bot.lastError}</div>}
          </div>
        )}

        {/* History */}
        {showHistory && history.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <div className="space-y-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 text-xs py-1">
                  <span className={h.healthy ? 'text-emerald-600' : 'text-red-600'}>
                    {h.healthy ? '✅' : '❌'}
                  </span>
                  <span className="text-gray-500">{new Date(h.checkedAt).toLocaleString('ru-RU')}</span>
                  {h.error && <span className="text-red-500 font-mono truncate">{h.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Test Message */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Тестовое сообщение</h3>
        {testResult && (
          <div className={`mb-3 p-3 rounded-md text-sm ${testResult.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
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
              placeholder="-1001234567890 или 12345678"
              className="input w-full text-sm"
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
              className="input w-full text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={sendingTest || !chatId.trim()}
            className="btn btn-primary text-sm disabled:opacity-50"
          >
            {sendingTest ? 'Отправка...' : 'Отправить тест'}
          </button>
        </form>
      </div>
    </div>
  )
}
