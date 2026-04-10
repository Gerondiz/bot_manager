# bot_manager — Telegram Bot Manager

## Цель
Веб-прослойка для управления Telegram ботами и навыками Алисы. Деплой на Vercel, БД Vercel Postgres.

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js App Router)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Dashboard    │  │ Bot Config   │  │ Analytics │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────┐
│  Backend (Next.js API Routes)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Bots API     │  │ Alice API    │  │ Webhooks  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
└─────────┼─────────────────┼────────────────┼───────┘
          │                 │                │
┌─────────┼─────────────────┼────────────────┼───────┐
│  Database (Vercel Postgres + Prisma)        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ bots     │  │ messages │  │ webhooks │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

---

## Database Schema (Prisma)

```prisma
model Bot {
  id            String   @id @default(uuid())
  name          String
  type          BotType  // TELEGRAM | ALICE
  token         String   @db.Text  // Шифруется перед записью
  tokenEncrypted Boolean @default(true)
  enabled       Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Настройки Telegram
  tgWebhookUrl     String?
  tgAllowGroups    Boolean  @default(false)
  tgAllowedGroups  String[] @default([])  // Array of group IDs
  
  // Настройки Alice
  aliceSkillId     String?
  aliceOauthToken  String?  @db.Text
  
  // Интеграции
  webhookUrl       String?  // URL для отправки событий (AAF)
  webhookSecret    String?  // Секрет для подписи webhook
  
  messages         Message[]
  logs             BotLog[]
  
  @@map("bots")
}

model Message {
  id          String   @id @default(uuid())
  botId       String
  chatId      String
  userId      String
  username    String?
  direction   Direction  // INCOMING | OUTGOING
  text        String   @db.Text
  timestamp   DateTime @default(now())
  
  bot         Bot      @relation(fields: [botId], references: [id])
  
  @@map("messages")
  @@index([botId, timestamp])
}

model BotLog {
  id        String   @id @default(uuid())
  botId     String
  level     LogLevel // INFO, WARNING, ERROR, CRITICAL
  message   String   @db.Text
  context   Json?
  timestamp DateTime @default(now())
  
  bot       Bot      @relation(fields: [botId], references: [id])
  
  @@map("bot_logs")
  @@index([botId, timestamp])
}

enum BotType {
  TELEGRAM
  ALICE
}

enum Direction {
  INCOMING
  OUTGOING
}

enum LogLevel {
  INFO
  WARNING
  ERROR
  CRITICAL
}
```

---

## API Endpoints

### Аутентификация

Все API эндпоинты (кроме webhook) требуют API ключ:
```
Authorization: Bearer <api_key>
```

API ключи генерируются через `/api/auth/keys`.

### Bot Management

#### `GET /api/bots`
Список всех ботов (без токенов).

**Response:**
```json
{
  "bots": [
    {
      "id": "uuid",
      "name": "My Bot",
      "type": "TELEGRAM",
      "enabled": true,
      "createdAt": "2026-04-09T12:00:00Z",
      "messageCount": 1234
    }
  ]
}
```

#### `POST /api/bots`
Создать нового бота.

**Request:**
```json
{
  "name": "My Bot",
  "type": "TELEGRAM",
  "token": "8337022742:AAG8-VRD...",
  "webhookUrl": "https://my-aaf.local/webhook",
  "tgAllowGroups": true,
  "tgAllowedGroups": ["-1001234567890"]
}
```

#### `GET /api/bots/:id`
Получить бота по ID.

#### `PATCH /api/bots/:id`
Обновить настройки бота.

#### `DELETE /api/bots/:id`
Удалить бота (и все связанные сообщения/логи).

#### `POST /api/bots/:id/toggle`
Включить/выключить бота.

#### `POST /api/bots/:id/message`
Отправить сообщение от имени бота.

**Request:**
```json
{
  "chatId": "123456789",
  "text": "Hello from bot_manager!"
}
```

### Messages

#### `GET /api/bots/:id/messages`
Получить сообщения бота.

**Query params:**
- `limit` (default: 50, max: 500)
- `offset` (default: 0)
- `direction` (INCOMING | OUTGOING)
- `from` (ISO date)
- `to` (ISO date)

#### `GET /api/bots/:id/messages/:messageId`
Получить конкретное сообщение.

### Logs

#### `GET /api/bots/:id/logs`
Получить логи бота.

**Query params:**
- `level` (INFO, WARNING, ERROR, CRITICAL)
- `limit` (default: 100)
- `from`, `to`

### Webhooks

#### `POST /api/webhook/:botId`
Входящий webhook от Telegram (для webhook mode).

**Headers:**
- `X-Telegram-Bot-Api-Secret-Token` — для верификации

#### `POST /api/webhook/alice/:skillId`
Входящий webhook от Алисы.

**Request (Alice Dialogs format):**
```json
{
  "meta": {
    "locale": "ru-RU",
    "timezone": "Europe/Moscow"
  },
  "request": {
    "command": "какая погода?",
    "original_utterance": "какая погода?",
    "type": "SimpleUtterance"
  },
  "session": {
    "message_id": 1,
    "session_id": "uuid",
    "user_id": "uuid"
  },
  "version": "1.0"
}
```

### Auth

#### `POST /api/auth/keys`
Создать API ключ.

**Request:**
```json
{
  "name": "AAF Integration",
  "permissions": ["bots:read", "bots:write", "messages:read"]
}
```

**Response:**
```json
{
  "key": "sk_live_abc123...",  // Показывается только один раз!
  "name": "AAF Integration",
  "createdAt": "2026-04-09T12:00:00Z"
}
```

#### `GET /api/auth/keys`
Список API ключей (без значений).

#### `DELETE /api/auth/keys/:keyId`
Отозвать API ключ.

---

## Alice Skills

### Архитектура интеграции

```
Alice Device  ──>  Yandex Dialogs API  ──>  bot_manager /api/webhook/alice/:skillId
                                                    │
                                               EventBus (AAF)
                                                    │
                                               Brain (ReAct)
                                                    │
                                               Response
```

### Создание навыка

Навыки Алисы создаются через код (JSON конфигурация):

```json
{
  "skill_id": "weather_mars",
  "name": "Погода на Марсе",
  "description": "Информирует о погоде на Марсе",
  "endpoints": {
    "webhook": "/api/webhook/alice/weather_mars"
  },
  "intents": [
    {
      "name": "weather",
      "utterances": ["какая погода на марсе", "погода марс"],
      "handler": "brain.query.weather_mars"
    }
  ]
}
```

### Безопасность Alice
- OAuth токены шифруются в БД
- Webhook от Yandex верифицируется через подпись
- Rate limiting на запросы

---

## Security Model

### Шифрование токенов
- Токены шифруются AES-256-GCM перед записью в БД
- Ключ шифрования хранится в Vercel Environment Variables
- При чтении токены никогда не возвращаются в API (кроме создания)

### Аутентификация
- API ключи для всех управляющих эндпоинтов
- Webhook верификация через `X-Signature` header
- Rate limiting: 100 req/min на API ключ

### Защита данных
- БД Vercel Postgres с encryption at rest
- Логи хранятся 30 дней (настраивается)
- GDPR: экспорт/удаление данных по запросу

### Vercel Serverless ограничения
- **Проблема:** serverless timeout 10s не подходит для long-polling
- **Решение:** Использовать **webhook mode** для Telegram ботов
  - Telegram → webhook → bot_manager → AAF webhook
  - bot_manager **не поллит**, только принимает webhook

---

## Конфигурация

### Environment Variables (Vercel)

```env
# Database
DATABASE_URL="postgresql://..."

# Encryption
ENCRYPTION_KEY="your-32-byte-hex-key"

# Auth
API_KEY_SALT="random-salt"

# Telegram Webhook Verification
TELEGRAM_WEBHOOK_SECRET="optional-secret"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# AAF Integration
AAF_WEBHOOK_URL="https://my-aaf.local/webhook"
AAF_WEBHOOK_SECRET="shared-secret"
```

---

## Frontend (Dashboard)

### Страницы

| Путь | Описание |
|------|----------|
| `/` | Dashboard — обзор всех ботов, статистика |
| `/bots` | Список ботов |
| `/bots/new` | Создание нового бота |
| `/bots/:id` | Настройки бота, логи, сообщения |
| `/alice` | Управление навыками Алисы |
| `/settings` | Настройки API ключей, webhook |
| `/analytics` | Статистика сообщений, графики |

### UI Components
- Таблица ботов с статусом (online/offline)
- Форма создания бота с валидацией токена
- Лог-вьюер с фильтрацией по уровню
- Message viewer с поиском
- API key manager

---

## Интеграция с qwen_aaf

### Webhook от bot_manager → qwen_aaf

Когда бот получает сообщение, bot_manager отправляет webhook:

```json
{
  "event": "bot.message.received",
  "bot_id": "uuid",
  "payload": {
    "chat_id": "123456789",
    "user_id": "987654321",
    "username": "@user",
    "text": "Привет!",
    "timestamp": "2026-04-09T12:00:00Z"
  },
  "signature": "hmac-sha256-..."
}
```

### Webhook от qwen_aaf → bot_manager

AAF может отправить команду боту:

```json
{
  "event": "aaf.command.send_message",
  "bot_id": "uuid",
  "payload": {
    "chat_id": "123456789",
    "text": "Ответ от AAF"
  },
  "signature": "hmac-sha256-..."
}
```

### Flow

```
Telegram User  ──>  Telegram API  ──webhook──>  bot_manager
                                                      │
                                               POST AAF webhook
                                                      │
qwen_aaf Layer 02 (Sensors)  <───────────────────────┘
       │
  EventBus → Layer 03 (Brain)
       │
  Response
       │
qwen_aaf  ──POST /api/bots/:id/message──>  bot_manager  ──>  Telegram API
```

---

## Roadmap

### Фаза 1: Core (текущая)
- [x] Спецификация
- [ ] Next.js проект + Prisma schema
- [ ] Базовый API (CRUD ботов)
- [ ] Интеграция с Vercel Postgres

### Фаза 2: Bot Integration
- [ ] Telegram webhook handler
- [ ] Message storage
- [ ] Logging system

### Фаза 3: Alice Integration
- [ ] Alice webhook handler
- [ ] Skill configuration UI
- [ ] Yandex Dialogs integration

### Фаза 4: Dashboard
- [ ] Frontend pages
- [ ] API key management
- [ ] Analytics

### Фаза 5: AAF Integration
- [ ] Webhook to qwen_aaf
- [ ] Command API from qwen_aaf
- [ ] End-to-end testing

---

## Деплой

```bash
# Локальная разработка
npm run dev

# Деплой на Vercel
vercel --prod

# Миграции БД
npx prisma migrate dev
npx prisma generate
```
