# Архитектура bot_manager — Текущее состояние

> Обновлено: 11 апреля 2026

## Обзор

Веб-приложение на Next.js 15 для управления Telegram-ботами. Централизованный хаб для CRUD операций, мониторинга здоровья ботов, отправки тестовых сообщений и просмотра логов. В будущем — маршрутизация событий к qwen_aaf.

**Стек:** Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, Neon HTTP driver (`@neondatabase/serverless`), JWT auth, PostgreSQL (Vercel Postgres / Neon).

---

## Архитектура БД

### Подключение

```
API Routes ──> @neondatabase/serverless Pool ──HTTPS (port 443)──> Neon PostgreSQL
                    │
                    └─ neonConfig.poolQueryViaFetch = true  (не WebSocket, оптимизировано для serverless)
```

**Важно:** Prisma используется **только для миграций**. Все API-роуты используют прямые SQL-запросы через `pool.query()`, а не Prisma Client.

### Схема (4 модели)

```
┌──────────────────────────────────────────┐
│  Bot (bots)                              │
│  ─────────────────────────────────────   │
│  id            uuid PK                   │
│  name          text                      │
│  type          TELEGRAM | ALICE          │
│  token         text (хранится как plain) │
│  tokenEncrypted bool (флаг, не работает) │
│  enabled       bool                      │
│  status        varchar(20) 'unknown'     │
│  lastChecked   timestamp                 │
│  lastError     text                      │
│  ── Telegram ──────────────────────────  │
│  tgWebhookUrl      text                  │
│  tgAllowGroups     bool                  │
│  tgAllowedGroups   text[]                │
│  ── Alice ─────────────────────────────  │
│  aliceSkillId      text                  │
│  aliceOauthToken   text                  │
│  ── Integration ───────────────────────  │
│  webhookUrl        text                  │
│  webhookSecret     text                  │
└──────────┬───────────────────────────────┘
           │ 1:N
     ┌─────┴──────────────┐    ┌────────────────────────┐
     │  Message           │    │  BotLog                │
     │  ──────────────    │    │  ─────────────         │
     │  id    uuid        │    │  id       uuid         │
     │  botId uuid FK     │    │  botId    uuid? (null) │
     │  chatId text       │    │  level    enum          │
     │  userId text       │    │  message  text          │
     │  username text?    │    │  context  json?         │
     │  dir   IN|OUT      │    │  ts       now()          │
     │  text  text        │    └────────────────────────┘
     │  ts    now()       │
     └────────────────────┘    ┌────────────────────────┐
                               │  ApiKey                │
                               │  ─────────────         │
                               │  id         uuid       │
                               │  name       text       │
                               │  keyHash    unique     │
                               │  permissions text[]    │
                               │  createdAt  now()      │
                               │  lastUsedAt ?           │
                               └────────────────────────┘
```

---

## Аутентификация

```
Browser ──POST {login,password}──> /api/auth/login
                                       │
                              Проверка env-переменных
                              ADMIN_LOGIN / ADMIN_PASSWORD
                                       │
                              JWT.sign({login, role:'admin'}, 24h)
                                       │
                              Set-Cookie: auth_token (httpOnly, secure, lax)
                                       │
Browser <── 200 {success: true} ───────┘

Browser ──GET /dashboard (cookie)──> middleware.ts
                                       │
                              Проверка auth_token cookie
                              Есть → NextResponse.next()
                              Нет  → redirect /login
```

**Защищённые маршруты** (matcher): `/dashboard/*`, `/bots/*`, `/alice/*`, `/settings/*`, `/analytics/*`, `/logs/*`

**Публичные**: `/login`, `/api/auth/login`, `/api/health`

---

## API Endpoints

### Auth
| Method | Path | Описание |
|--------|------|----------|
| POST | `/api/auth/login` | Вход по логину/паролю, установка JWT cookie |

### Bots CRUD
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots` | Список всех ботов + messageCount |
| POST | `/api/bots` | Создать бота (name, type, token обязательны) |
| GET | `/api/bots/:id` | Получить бота полностью |
| PATCH | `/api/bots/:id` | Частичное обновление (name, webhookUrl, tgWebhookUrl, tgAllowGroups, enabled) |
| DELETE | `/api/bots/:id` | Удалить бота |
| POST | `/api/bots/:id/toggle` | Переключить enabled ↔ disabled |

### Diagnostics (Telegram only)
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots/:id/health` | Последний сохранённый статус здоровья из БД |
| POST | `/api/bots/:id/health` | **Активная проверка**: getMe + getWebhookInfo → обновляет БД |
| POST | `/api/bots/:id/test` | Отправить тестовое сообщение (требует chatId) |

### Logs
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/logs` | Логи с фильтрацией по level, pagination (limit до 500) |
| GET | `/api/logs/error` | Только ERROR + CRITICAL |

### Webhooks
| Method | Path | Описание |
|--------|------|----------|
| POST | `/api/webhook/telegram/:botId` | Приём webhook от Telegram (заглушка, TODO) |

---

## Фронтенд-страницы

| Путь | Описание |
|------|----------|
| `/` | Редирект на `/dashboard` |
| `/login` | Форма входа |
| `/dashboard` | Dashboard (счётчики — заглушки, TODO) |
| `/bots` | Список ботов с toggle/delete |
| `/bots/new` | Создание бота |
| `/bots/:id` | **Редактирование + Диагностика** (health check + тестовое сообщение) |
| `/logs` | Таблица логов с фильтром по level |
| `/settings` | Настройки AAF (заглушка, TODO) |

### Страница бота `/bots/:id` — Диагностика

```
┌─────────────────────────────────────┐
│  🔧 Диагностика                     │
│                                     │
│  ┌─ Проверка здоровья ────────────┐ │
│  │ [Проверить]                    │ │
│  │                                 │ │
│  │ ✅ Бот работает                 │ │
│  │ @DailyBot (Daily)               │ │
│  │ ID: 8337022742                  │ │
│  │ Группы: Да                      │ │
│  │                                 │ │
│  │ Webhook                         │ │
│  │ https://bot-manager/...         │ │
│  │ ⏳ Ожидает: 0                   │ │
│  └─────────────────────────────────┘ │
│                                     │
│  ┌─ Тестовое сообщение ───────────┐ │
│  │ Chat ID: [__________]           │ │
│  │ Текст:   [__________]           │ │
│  │ [Отправить тест]                │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Telegram интеграция (`src/lib/telegram.ts`)

```
callTelegramAPI(token, method, body?)
    │
    ├─ POST https://api.telegram.org/bot{token}/{method}
    │  Content-Type: application/json
    │  Body: JSON.stringify(body)
    │
    ├─ checkBotHealth(token)     → getMe        → {healthy, botInfo, error}
    ├─ checkWebhookStatus(token) → getWebhookInfo → {webhookInfo, error}
    └─ sendTestMessage(token, chatId, text) → sendMessage → {success, messageId}
```

> ⚠️ **Важно:** Health check работает только если сервер имеет доступ к `api.telegram.org`. На локальных серверах в РФ может быть заблокирован.

---

## Flow: создание бота

```
User → /bots/new
       │
       └─ POST /api/bots {name, type, token}
              │
              └─ INSERT INTO bots (gen_random_uuid(), NOW(), NOW())
                     │
                     └─ 201 {bot: {...}}
                            │
                            └─ Редирект на /bots
```

---

## Flow: health check

```
User → /bots/:id → [Проверить]
       │
       └─ POST /api/bots/:id/health
              │
              ├─ SELECT token FROM bots WHERE id = $1
              ├─ checkBotHealth(token)  →  GET api.telegram.org/bot{token}/getMe
              ├─ checkWebhookStatus(token) → GET api.telegram.org/bot{token}/getWebhookInfo
              ├─ UPDATE bots SET status='online'|'error', lastChecked=NOW(), lastError=$1
              └─ 200 {health, webhook, bot}
```

---

## Flow: входящее сообщение (webhook) — TODO

```
Telegram → POST /api/webhook/telegram/:botId
              │
              ├─ SELECT * FROM bots WHERE id = $1 AND enabled = true
              ├─ INSERT INTO messages (INCOMING)
              │
              └─ TODO: если webhookUrl → fetch(AAF_WEBHOOK_URL, {event: 'bot.message.received'})
                     ⚠️ Код закомментирован!
```

---

## Тесты

### API тесты (`tests/test_local.js`)
```bash
node tests/test_local.js
# 11 тестов: login, auth guard, bots CRUD, logs, health endpoint
# Без зависимостей — использует native fetch (Node.js 22+)
```

### E2E тесты (требуют Selenium + httpx)
```bash
python3 tests/test_e2e.py    # API (httpx) + UI (Selenium/Firefox)
python3 tests/test_login.py  # Только login (Selenium)
python3 tests/test_full.py   # Полный набор (Selenium)
```

---

## Конфигурация

### Ключевые env-переменные

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL строка подключения |
| `ENCRYPTION_KEY` | 32-byte hex (AES-256, пока не используется) |
| `ADMIN_LOGIN` | Логин администратора |
| `ADMIN_PASSWORD` | Пароль администратора |
| `JWT_SECRET` | 32+ символа для JWT подписи |
| `AAF_WEBHOOK_URL` | URL qwen_aaf (TODO) |
| `AAF_WEBHOOK_SECRET` | Shared secret для HMAC (TODO) |

### Деплой (Vercel)

```json
// vercel.json
{
  "buildCommand": "npx prisma migrate deploy && prisma generate && next build",
  "framework": "nextjs"
}
```

```bash
# Локальный запуск
npm install
npx prisma migrate deploy   # применить миграции
npm run dev                 # http://localhost:3000

# Тесты
node tests/test_local.js

# Продакшен
vercel --prod
npx prisma migrate deploy   # миграции на проде
```

---

## Не реализовано (TODO)

| Фича | Статус |
|------|--------|
| **Отправка событий в AAF** | Код в webhook роуте закомментирован |
| **HMAC верификация webhook** | Заглушка, всегда пропускает |
| **Шифрование токенов ботов** | Поле `tokenEncrypted` есть, но токены в plain text |
| **Dashboard счётчики** | Хардкод нулей, нет запроса к API |
| **Rate limiting** | Env-переменные есть, middleware нет |
| **API ключи (CRUD)** | Модель есть, endpoints нет |
| **Alice интеграция** | Поля в схеме есть, логика нет |
| **Первая миграция** | Есть только `002_add_bot_health_fields`. Начальная схема через `scripts/init-db.sql` |

---

## Известные проблемы

1. **`secure: true` cookie** — при локальной разработке на HTTP cookie не устанавливается. Для локального dev нужно `secure: process.env.NODE_ENV === 'production'`
2. **Telegram API блокировка** — серверы в РФ могут не иметь доступа к `api.telegram.org` (IP: 149.154.166.110). Требуется proxy.
3. **Прямые SQL-запросы** — обходится типобезопасность Prisma. Ошибки в SQL не ловятся на этапе компиляции.
