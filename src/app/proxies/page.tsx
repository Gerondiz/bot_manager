'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/ui/Navbar'

interface Proxy {
  server: string
  port: number
  secret: string
  link: string
}

export default function ProxiesPage() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [total, setTotal] = useState(0)
  const [alive, setAlive] = useState(0)
  const [dead, setDead] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [filter, setFilter] = useState('')

  const fetchProxies = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/proxies')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProxies(data.proxies || [])
      setTotal(data.total || 0)
      setAlive(data.alive || 0)
      setDead(data.dead || 0)
      setLastChecked(data.lastChecked || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProxies() }, [])

  const filtered = proxies.filter(p =>
    p.server.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">MTProto прокси</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Источник: <a href="https://github.com/SoliSpirit/mtproto" target="_blank" className="text-blue-600 hover:underline">SoliSpirit/mtproto</a>
              {lastChecked && <> · Обновлено {new Date(lastChecked).toLocaleTimeString('ru-RU')}</>}
            </p>
          </div>
          <button
            onClick={fetchProxies}
            disabled={loading || checking}
            className="btn btn-secondary"
          >
            <svg className={`w-4 h-4 ${loading || checking ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            {loading || checking ? 'Проверка...' : 'Обновить'}
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-500">Всего в списке</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{alive}</p>
              <p className="text-xs text-gray-500">Рабочих</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{dead}</p>
              <p className="text-xs text-gray-500">Недоступных</p>
            </div>
          </div>
        )}

        {/* Search */}
        {proxies.length > 10 && (
          <div className="mb-6">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Поиск по серверу..."
                className="input pl-10 max-w-sm"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-100">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                  <div className="w-32 h-4 bg-gray-200 rounded" />
                  <div className="w-12 h-4 bg-gray-200 rounded" />
                  <div className="flex-1" />
                  <div className="w-20 h-6 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {filter ? 'Ничего не найдено' : 'Рабочих прокси нет'}
            </h3>
            <p className="text-sm text-gray-500">
              {filter ? 'Попробуйте другой запрос' : 'Попробуйте обновить позже'}
            </p>
          </div>
        ) : (
          /* Proxy list */
          <div className="card overflow-hidden">
            {/* Table header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <span className="w-2" />
              <span className="w-8">#</span>
              <span className="flex-1">Сервер</span>
              <span className="w-16">Порт</span>
              <span className="w-28">Действие</span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto scrollbar-thin">
              {filtered.map((proxy, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center gap-3 hover:bg-blue-50/50 transition-colors group">
                  {/* Alive indicator */}
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 flex-shrink-0" />

                  {/* Number */}
                  <span className="text-xs text-gray-400 w-8 flex-shrink-0">{idx + 1}</span>

                  {/* Server */}
                  <span className="flex-1 text-sm font-mono text-gray-700 truncate">{proxy.server}</span>

                  {/* Port */}
                  <span className="badge badge-info w-16 justify-center">{proxy.port}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Copy link */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(proxy.link)
                        setCopiedIdx(idx)
                        setTimeout(() => setCopiedIdx(null), 2000)
                      }}
                      className="btn btn-ghost p-1.5"
                      title="Копировать ссылку"
                    >
                      {copiedIdx === idx ? (
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                      )}
                    </button>

                    {/* Open in Telegram */}
                    <a
                      href={proxy.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                      title="Открыть в Telegram"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
