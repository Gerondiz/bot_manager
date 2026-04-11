import { NextResponse } from 'next/server'

const PROXY_LIST_URL = 'https://raw.githubusercontent.com/SoliSpirit/mtproto/master/all_proxies.txt'

interface ParsedProxy {
  server: string
  port: number
  secret: string
  link: string
}

/**
 * Парсит tg://proxy ссылку
 */
function parseProxyUrl(line: string): ParsedProxy | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('https://t.me/proxy?')) return null

  const url = new URL(trimmed)
  const server = url.searchParams.get('server')
  const port = url.searchParams.get('port')
  const secret = url.searchParams.get('secret')

  if (!server || !port || !secret) return null

  return {
    server: server.replace(/\.$/, ''), // remove trailing dot
    port: parseInt(port, 10),
    secret,
    link: trimmed,
  }
}

/**
 * Проверка доступности прокси через TCP connect
 * Timeout: 3 секунды на прокси
 */
async function checkProxy(proxy: ParsedProxy, signal: AbortSignal): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    signal.addEventListener('abort', () => {
      clearTimeout(timeout)
      controller.abort()
    })

    const res = await fetch(`http://${proxy.server}:${proxy.port}`, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'manual',
    })
    // Любой ответ (даже error) означает что порт открыт
    return true
  } catch {
    // fetch выбросил — соединение не установлено
    return false
  }
}

export async function GET() {
  try {
    // 1. Скачиваем список
    const rawRes = await fetch(PROXY_LIST_URL, {
      next: { revalidate: 300 }, // кэш 5 мин
    })
    if (!rawRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch proxy list' }, { status: 502 })
    }
    const rawText = await rawRes.text()

    // 2. Парсим
    const proxies = rawText
      .split('\n')
      .map(parseProxyUrl)
      .filter((p): p is ParsedProxy => p !== null)

    // 3. Проверяем доступность параллельно (батчами по 20)
    const batchSize = 20
    const results: Array<{ proxy: ParsedProxy; alive: boolean }> = []

    for (let i = 0; i < proxies.length; i += batchSize) {
      const batch = proxies.slice(i, i + batchSize)
      const controller = new AbortController()

      const checks = batch.map(async (proxy) => {
        const alive = await checkProxy(proxy, controller.signal)
        return { proxy, alive }
      })

      const batchResults = await Promise.allSettled(checks)
      batchResults.forEach((r) => {
        if (r.status === 'fulfilled') {
          results.push(r.value)
        }
      })
    }

    // 4. Формируем ответ
    const aliveProxies = results
      .filter((r) => r.alive)
      .map((r) => ({
        server: r.proxy.server,
        port: r.proxy.port,
        secret: r.proxy.secret,
        link: r.proxy.link,
      }))

    return NextResponse.json({
      total: proxies.length,
      alive: aliveProxies.length,
      dead: proxies.length - aliveProxies.length,
      proxies: aliveProxies,
      lastChecked: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Proxy check error:', error)
    return NextResponse.json(
      { error: 'Failed to check proxies', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
