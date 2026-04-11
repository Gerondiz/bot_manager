'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

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

interface BotProfile {
  name: string
  description: string
  shortDescription: string
}

interface WebhookInfo {
  webhook?: {
    url?: string
    pending_update_count?: number
    last_error_message?: string
  }
}

export default function SettingsTab({ bot, onBotUpdate }: { bot: Bot; onBotUpdate: (b: Bot | null) => void }) {
  const router = useRouter()
  const [name, setName] = useState(bot.name)
  const [webhookUrl, setWebhookUrl] = useState(bot.webhookUrl || '')
  const [tgWebhookUrl, setTgWebhookUrl] = useState(bot.tgWebhookUrl || '')
  const [tgAllowGroups, setTgAllowGroups] = useState(bot.tgAllowGroups)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile
  const [profile, setProfile] = useState<BotProfile>({ name: '', description: '', shortDescription: '' })
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Webhook
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null)
  const [loadingWebhook, setLoadingWebhook] = useState(false)

  useEffect(() => {
    if (bot.type === 'TELEGRAM') {
      fetchProfile()
      fetchWebhookInfo()
    }
  }, [bot.id, bot.type])

  const fetchProfile = async () => {
    setLoadingProfile(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/profile`)
      if (!res.ok) return
      const data = await res.json()
      setProfile(data.profile || { name: '', description: '', shortDescription: '' })
    } catch {}
    finally { setLoadingProfile(false) }
  }

  const fetchWebhookInfo = async () => {
    setLoadingWebhook(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/webhook`)
      if (!res.ok) return
      const data = await res.json()
      setWebhookInfo(data)
    } catch {}
    finally { setLoadingWebhook(false) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          webhookUrl: webhookUrl || null,
          tgWebhookUrl: tgWebhookUrl || null,
          tgAllowGroups,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onBotUpdate({ ...bot, name, webhookUrl, tgWebhookUrl, tgAllowGroups })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error('Failed')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSetWebhook = async () => {
    if (!tgWebhookUrl) return
    try {
      const res = await fetch(`/api/bots/${bot.id}/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tgWebhookUrl }),
      })
      if (!res.ok) throw new Error('Failed')
      fetchWebhookInfo()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleDeleteWebhook = async () => {
    if (!confirm('Удалить webhook?')) return
    try {
      const res = await fetch(`/api/bots/${bot.id}/webhook`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setTgWebhookUrl('')
      fetchWebhookInfo()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleToggle = async () => {
    try {
      const res = await fetch(`/api/bots/${bot.id}/toggle`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      onBotUpdate({ ...bot, enabled: data.bot.enabled })
    } catch {}
  }

  const handleDelete = async () => {
    if (!confirm(`Удалить бота "${bot.name}"?`)) return
    try {
      const res = await fetch(`/api/bots/${bot.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      router.push('/bots')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    }
  }

  // Health check in settings
  const [checking, setChecking] = useState(false)
  const [checkStatus, setCheckStatus] = useState<'online' | 'error' | null>(null)
  const [checkInfo, setCheckInfo] = useState<string>('')

  const handleCheckConnection = async () => {
    setChecking(true)
    setCheckStatus(null)
    setCheckInfo('')
    try {
      const res = await fetch(`/api/bots/${bot.id}/health`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setCheckStatus(data.health?.healthy ? 'online' : 'error')
      if (data.health?.botInfo) {
        setCheckInfo(`@${data.health.botInfo.username} (${data.health.botInfo.first_name})`)
      }
      if (data.health?.error) {
        setCheckInfo(data.health.error)
      }
    } catch (err) {
      setCheckStatus('error')
      setCheckInfo(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Основные настройки</h3>
          <div className="flex items-center gap-2">
            {checkStatus && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                checkStatus === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${checkStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {checkStatus === 'online' ? 'Подключён' : 'Ошибка'}
              </span>
            )}
            <button
              onClick={handleCheckConnection}
              disabled={checking}
              className="btn btn-secondary text-xs disabled:opacity-50"
              title="Проверить подключение"
            >
              {checking ? (
                <div className="animate-spin w-3.5 h-3.5 border-2 border-gray-600 border-t-transparent rounded-full" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {checking ? 'Проверка...' : 'Проверить'}
            </button>
          </div>
        </div>
        {checkInfo && (
          <div className={`mb-3 p-2.5 rounded-md text-xs font-mono break-all ${
            checkStatus === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {checkInfo}
          </div>
        )}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Тип</label>
            <p className="text-sm text-gray-600">{bot.type}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">AAF Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="input w-full text-sm font-mono"
              placeholder="https://your-aaf.example.com/webhook/v1/event"
            />
          </div>

          {bot.type === 'TELEGRAM' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Telegram Webhook URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={tgWebhookUrl}
                    onChange={(e) => setTgWebhookUrl(e.target.value)}
                    className="input flex-1 text-sm font-mono"
                  />
                  <button type="button" onClick={handleSetWebhook} className="btn btn-secondary text-sm">
                    Set
                  </button>
                  <button type="button" onClick={handleDeleteWebhook} className="btn btn-ghost text-sm text-red-600">
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tgGroups"
                  checked={tgAllowGroups}
                  onChange={(e) => setTgAllowGroups(e.target.checked)}
                />
                <label htmlFor="tgGroups" className="text-sm text-gray-600">
                  Разрешить группы
                </label>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm text-gray-500">Статус:</span>
            <span className={`px-2.5 py-1 rounded text-xs font-medium ${
              bot.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {bot.enabled ? 'Активен' : 'Отключён'}
            </span>
            <button type="button" onClick={handleToggle} className="text-sm text-blue-600 hover:underline">
              {bot.enabled ? 'Отключить' : 'Включить'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn btn-primary text-sm disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={handleDelete} className="btn btn-ghost text-sm text-red-600 hover:text-red-700">
              Удалить бота
            </button>
          </div>
        </form>
      </div>

      {/* Bot Profile (Telegram) */}
      {bot.type === 'TELEGRAM' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Профиль бота в Telegram</h3>
            {loadingProfile && <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Имя бота</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="input w-full text-sm"
                placeholder="Daily Bot"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Описание (Description)</label>
              <textarea
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                rows={2}
                className="input w-full text-sm"
                placeholder="Текст, который видит пользователь при открытии профиля бота"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Короткое описание (About)</label>
              <input
                type="text"
                value={profile.shortDescription}
                onChange={(e) => setProfile({ ...profile, shortDescription: e.target.value })}
                className="input w-full text-sm"
                placeholder="Краткое описание в списке чатов"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {savingProfile ? 'Сохранение...' : 'Сохранить профиль'}
            </button>
          </div>
        </div>
      )}

      {/* Webhook Status */}
      {bot.type === 'TELEGRAM' && webhookInfo && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Статус Telegram Webhook</h3>
          {loadingWebhook ? (
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          ) : webhookInfo.webhook?.url ? (
            <div className="space-y-2 text-sm">
              <div className="font-mono text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded break-all">
                {webhookInfo.webhook.url}
              </div>
              {webhookInfo.webhook.pending_update_count !== undefined && webhookInfo.webhook.pending_update_count > 0 && (
                <div className="text-amber-600">⏳ Ожидает: {webhookInfo.webhook.pending_update_count}</div>
              )}
              {webhookInfo.webhook.last_error_message && (
                <div className="text-red-600 text-xs">⚠️ {webhookInfo.webhook.last_error_message}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Webhook не установлен</div>
          )}
        </div>
      )}
    </div>
  )
}
