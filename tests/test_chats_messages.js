import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'a127oc'

let testBotId = ''
let authHeaders = {}

async function loginAndGetHeaders(request) {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { login: ADMIN_LOGIN, password: ADMIN_PASSWORD }
  })
  if (res.status() !== 200) {
    const body = await res.text()
    throw new Error(`Login failed: ${res.status()} ${body}`)
  }
  const setCookie = res.headers()['set-cookie'] || ''
  const match = setCookie.match(/auth_token=([^;]+)/)
  if (!match) throw new Error(`No auth_token in response. Headers: ${JSON.stringify(res.headers())}`)
  return { 'Cookie': `auth_token=${match[1]}` }
}

test.describe('Bot Chats and Messages', () => {
  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAndGetHeaders(request)
  })

  test('1) GET /api/bots returns bots', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/bots`, { headers: authHeaders })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.bots).toBeDefined()
    expect(Array.isArray(data.bots)).toBe(true)
    expect(data.bots.length).toBeGreaterThan(0)
    
    // Find Тест or Секретарь bot
    const targetBot = data.bots.find(b => b.name === 'Тест' || b.name === 'Секретарь')
    if (targetBot) {
      testBotId = targetBot.id
      console.log(`Found bot: ${targetBot.name} (${testBotId}), status: ${targetBot.status}`)
    } else {
      testBotId = data.bots[0].id
      console.log(`Using first bot: ${data.bots[0].name} (${testBotId})`)
    }
  })

  test('2) POST poll — fetch updates from Telegram', async ({ request }) => {
    if (!testBotId) { test.skip(); return }
    const res = await request.post(`${BASE_URL}/api/bots/${testBotId}/poll`, {
      headers: authHeaders,
      data: { limit: 100 }
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.messages).toBeDefined()
    expect(data.chats).toBeDefined()
    console.log(`Poll ${testBotId}: ${data.messages} msgs, ${data.chats} chats, offset: ${data.newOffset}`)
  })

  test('3) GET /chats returns chats after poll', async ({ request }) => {
    if (!testBotId) { test.skip(); return }
    const res = await request.get(`${BASE_URL}/api/bots/${testBotId}/chats`, { headers: authHeaders })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.chats).toBeDefined()
    console.log(`Chats: ${data.total} total`)
    if (data.chats.length > 0) {
      console.log(`First chat: ${data.chats[0].chatId} | ${data.chats[0].type} | ${data.chats[0].title || '(no title)'}`)
    }
  })

  test('4) GET /messages returns messages after poll', async ({ request }) => {
    if (!testBotId) { test.skip(); return }
    // Get first chat
    const chatsRes = await request.get(`${BASE_URL}/api/bots/${testBotId}/chats`, { headers: authHeaders })
    const { chats } = await chatsRes.json()
    if (chats.length === 0) { test.skip(); return }

    const chatId = chats[0].chatId
    const res = await request.get(
      `${BASE_URL}/api/bots/${testBotId}/messages?chatId=${encodeURIComponent(chatId)}&limit=20`,
      { headers: authHeaders }
    )
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.messages).toBeDefined()
    console.log(`Messages for chat ${chatId}: ${data.total} total, ${data.messages.length} returned`)
    if (data.messages.length > 0) {
      console.log(`First: ${data.messages[0].direction} | ${data.messages[0].text?.substring(0, 50) || '[media]'}`)
    }
  })

  test('5) POST /messages sends a message', async ({ request }) => {
    if (!testBotId) { test.skip(); return }
    const chatsRes = await request.get(`${BASE_URL}/api/bots/${testBotId}/chats`, { headers: authHeaders })
    const { chats } = await chatsRes.json()
    if (chats.length === 0) { test.skip(); return }

    const chatId = chats[0].chatId
    const res = await request.post(`${BASE_URL}/api/bots/${testBotId}/messages`, {
      headers: authHeaders,
      data: { chatId, text: 'Test from bot_manager' }
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    console.log(`Message sent, messageId: ${data.messageId}`)
  })

  test('6) GET /health/history returns history', async ({ request }) => {
    if (!testBotId) { test.skip(); return }
    const res = await request.get(`${BASE_URL}/api/bots/${testBotId}/health/history`, { headers: authHeaders })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.history).toBeDefined()
    console.log(`Health history: ${data.total} entries`)
  })

  test('7) UI: navigate to bot detail and see tabs', async ({ page }) => {
    if (!testBotId) { test.skip(); return }
    await page.goto(`${BASE_URL}/bots/${testBotId}?tab=chats`)
    await page.waitForURL(/.*\/bots\/[a-f0-9-]+.*/, { timeout: 10000 })

    // Wait for content to render
    await page.waitForTimeout(1000)
    
    const pageText = await page.locator('body').innerText()
    
    // If we don't see tabs, maybe page errored — screenshot for debug
    if (!pageText.includes('Чаты')) {
      console.log('Page text:', pageText.substring(0, 500))
    }
    
    expect(pageText).toContain('Чаты')
    expect(pageText).toContain('Сообщения')
    expect(pageText).toContain('Команды')
    expect(pageText).toContain('Диагностика')
    expect(pageText).toContain('Настройки')
  })
})
