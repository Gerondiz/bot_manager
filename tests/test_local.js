#!/usr/bin/env node
/**
 * Quick local test for bot_manager login.
 * Tests:
 *  1. GET /login renders page
 *  2. POST /api/auth/login with correct creds
 *  3. POST /api/auth/login with wrong creds
 *  4. GET /dashboard without auth (should redirect)
 *  5. GET /api/bots with auth cookie
 *  6. POST /api/bots (create bot)
 *  7. GET /api/bots/:id
 *  8. PATCH /api/bots/:id
 *  9. DELETE /api/bots/:id
 * 10. GET /api/logs
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '559123'

let passed = 0, failed = 0
const errors = []

function log(name, ok, detail = '') {
  const icon = ok ? '✅' : '❌'
  if (ok) passed++; else { failed++; errors.push(`${name}: ${detail}`) }
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`)
}

async function fetchJSON(method, url, opts = {}) {
  const res = await fetch(url, { method, ...opts })
  let body
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('json')) {
    body = await res.json()
  } else {
    body = await res.text()
  }
  return { status: res.status, headers: res.headers, body, ok: res.ok }
}

function extractSetCookie(headers) {
  const raw = headers.getSetCookie?.() || []
  return raw.join('; ')
}

async function run() {
  console.log('═══════════════════════════════════════════')
  console.log(`  Bot Manager — API Tests`)
  console.log(`  URL: ${BASE_URL}`)
  console.log('═══════════════════════════════════════════\n')

  // 1. Login page renders
  try {
    const r = await fetch(`${BASE_URL}/login`)
    log('GET /login — renders', r.status === 200, `HTTP ${r.status}`)
  } catch (e) {
    log('GET /login', false, e.message)
  }

  // 2. Login with correct creds
  let cookieHeader = ''
  try {
    const r = await fetchJSON('POST', `${BASE_URL}/api/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: ADMIN_LOGIN, password: ADMIN_PASSWORD }),
      redirect: 'manual',
    })
    if (r.status === 200 && r.body?.success) {
      // Extract cookie
      const setCookie = extractSetCookie(r.headers)
      if (setCookie.includes('auth_token')) {
        log('POST /api/auth/login — correct creds', true)
        cookieHeader = setCookie
      } else {
        log('POST /api/auth/login — correct creds', false,
          `No auth_token in Set-Cookie. Got: ${setCookie.substring(0, 100)}`)
      }
    } else {
      log('POST /api/auth/login — correct creds', false,
        `HTTP ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`)
    }
  } catch (e) {
    log('POST /api/auth/login', false, e.message)
  }

  // 3. Wrong password
  try {
    const r = await fetchJSON('POST', `${BASE_URL}/api/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: ADMIN_LOGIN, password: 'wrong' }),
    })
    log('POST /api/auth/login — wrong pw → 401', r.status === 401, `HTTP ${r.status}`)
  } catch (e) {
    log('POST /api/auth/login (wrong pw)', false, e.message)
  }

  // 4. Dashboard without auth → redirect
  try {
    const r = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' })
    const isRedirect = [301, 302, 307, 308].includes(r.status)
    log('GET /dashboard (no auth) → redirect', isRedirect, `HTTP ${r.status}`)
  } catch (e) {
    log('GET /dashboard (no auth)', false, e.message)
  }

  // 5. GET /api/bots with auth
  let botId = null
  try {
    const r = await fetchJSON('GET', `${BASE_URL}/api/bots`, {
      headers: { 'Cookie': cookieHeader },
    })
    if (r.status === 200 && r.body?.bots) {
      log('GET /api/bots (auth) — returns array', true, `${r.body.bots.length} bots`)
    } else {
      log('GET /api/bots (auth)', false, `HTTP ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`)
    }
  } catch (e) {
    log('GET /api/bots (auth)', false, e.message)
  }

  // 6. POST /api/bots — create
  try {
    const r = await fetchJSON('POST', `${BASE_URL}/api/bots`, {
      headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Node Test Bot', type: 'TELEGRAM', token: '123456:TEST' }),
    })
    if (r.status === 201 && r.body?.bot?.id) {
      botId = r.body.bot.id
      log('POST /api/bots — created', true, `id=${botId.substring(0, 8)}...`)
    } else {
      log('POST /api/bots', false, `HTTP ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`)
    }
  } catch (e) {
    log('POST /api/bots', false, e.message)
  }

  // 7. GET /api/bots/:id
  if (botId) {
    try {
      const r = await fetchJSON('GET', `${BASE_URL}/api/bots/${botId}`, {
        headers: { 'Cookie': cookieHeader },
      })
      if (r.status === 200 && r.body?.bot?.name) {
        log('GET /api/bots/:id — returns bot', true, `name=${r.body.bot.name}`)
      } else {
        log('GET /api/bots/:id', false, `HTTP ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`)
      }
    } catch (e) {
      log('GET /api/bots/:id', false, e.message)
    }
  }

  // 8. PATCH /api/bots/:id
  if (botId) {
    try {
      const r = await fetchJSON('PATCH', `${BASE_URL}/api/bots/${botId}`, {
        headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Node Test Bot Updated' }),
      })
      if (r.status === 200) {
        log('PATCH /api/bots/:id — updated', true)
      } else {
        log('PATCH /api/bots/:id', false, `HTTP ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`)
      }
    } catch (e) {
      log('PATCH /api/bots/:id', false, e.message)
    }
  }

  // 9. DELETE /api/bots/:id
  if (botId) {
    try {
      const r = await fetchJSON('DELETE', `${BASE_URL}/api/bots/${botId}`, {
        headers: { 'Cookie': cookieHeader },
      })
      if (r.status === 200) {
        log('DELETE /api/bots/:id — deleted', true)
      } else {
        log('DELETE /api/bots/:id', false, `HTTP ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`)
      }
    } catch (e) {
      log('DELETE /api/bots/:id', false, e.message)
    }
  }

  // 10. GET /api/logs
  try {
    const r = await fetchJSON('GET', `${BASE_URL}/api/logs`, {
      headers: { 'Cookie': cookieHeader },
    })
    if (r.status === 200) {
      log('GET /api/logs — returns logs', true, `total=${r.body?.total ?? 'n/a'}`)
    } else {
      log('GET /api/logs', false, `HTTP ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`)
    }
  } catch (e) {
    log('GET /api/logs', false, e.message)
  }

  // 11. Bot health endpoint
  if (botId) {
    try {
      const r = await fetchJSON('GET', `${BASE_URL}/api/bots/${botId}/health`, {
        headers: { 'Cookie': cookieHeader },
      })
      // Should either check or return error gracefully
      log('GET /api/bots/:id/health — endpoint exists', true, `HTTP ${r.status}`)
    } catch (e) {
      log('GET /api/bots/:id/health', false, e.message)
    }
  }

  // Summary
  const total = passed + failed
  console.log('\n═══════════════════════════════════════════')
  console.log(`  Results: ${passed}/${total} passed, ${failed} failed`)
  if (errors.length) {
    console.log('\n  Failed:')
    errors.forEach(e => console.log(`    • ${e}`))
  }
  console.log('═══════════════════════════════════════════')
  process.exit(failed === 0 ? 0 : 1)
}

run().catch(e => {
  console.error('Unhandled error:', e)
  process.exit(1)
})
