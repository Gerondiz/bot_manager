# Bot Manager — Текущее состояние и логика работы

> Обновлено: 12 апреля 2026

---

## 1. Общая архитектура

```
Telegram API ──poll/webhook──> bot_manager (Next.js / Vercel)
                                       │
                              Neon PostgreSQL (HTTP)
                                       │
                              UI: /bots/:id с табами
```

### Ключевые компоненты

| Компонент | Описание |
|-----------|----------|
| **Next.js 15** | App Router, server components, API routes |
| **Neon PostgreSQL** | HTTP-драйвер (`@neondatabase/serverless`), без WebSocket |
| **Prisma** | Только для генерации клиента, **не управляет миграциями** |
| **JWT Auth** | Cookie `auth_token` (httpOnly, secure в production) |
| **Telegram API** | Прямые fetch-запросы к `api.telegram.org` |

---

## 2. База данных

### Схема (5 таблиц + enums)

```
┌──────────────────────────────────────────┐
│  Bot (bots)                              │
│  ─────────────────────────────────────   │
│  id            TEXT PK                   │
│  name          TEXT                      │
│  type          TELEGRAM | ALICE           │
│  token         TEXT                      │
│  enabled       BOOL                      │
│  status        TEXT (online/error/unk)   │
│  lastUpdateId  INTEGER DEFAULT 0 ← NEW   │
│  ── Telegram ──────────────────────────  │
│  tgWebhookUrl  TEXT                      │
│  tgAllowGroups BOOL                      │
│  ── Интеграции ────────────────────────  │
│  webhookUrl    TEXT (AAF)                │
│  webhookSecret TEXT                      │
└──────────┬───────────────────────────────┘
           │ 1:N
     ┌─────┴──────────────┐    ┌────────────────────────┐
     │  Message           │    │  BotLog                │
     │  ──────────────    │    │  ─────────────         │
     │  id    TEXT        │    │  id       TEXT          │
     │  botId TEXT FK     │    │  botId    TEXT?          │
     │  chatId TEXT       │    │  level    enum           │
     │  userId TEXT       │    │  message  TEXT           │
     │  direction IN/OUT  │    │  context  json?           │
     │  text    TEXT?     │    │  ts       now()           │
     │  photoFileId TEXT? │    └────────────────────────┘
     │  messageId   INT?  │
     │  timestamp   now() │    ┌────────────────────────┐
     └────────────────────┘    │  HealthCheck (NEW)     │
                               │  ─────────────────     │
     ┌────────────────────────┐│  id       TEXT          │
     │  BotChat (NEW)         ││  botId    TEXT FK       │
     │  ─────────────────     ││  healthy  BOOL           │
     │  id    TEXT            ││  status   TEXT           │
     │  botId TEXT FK         ││  error    TEXT?           │
     │  chatId TEXT           ││  checkedAt now()          │
     │  type   TEXT           │└──────────────┬───────────┘
     │  title  TEXT?          │               │
     │  lastSeen now()        │    ┌──────────┴──────────┐
     └────────────────────────┘    │  ApiKey             │
                                   │  ─────────────      │
                                   │  id         TEXT    │
                                   │  keyHash    unique  │
                                   │  permissions TEXT[] │
                                   └─────────────────────┘
```

### Важные особенности

- Все `id` — `TEXT`, не UUID-тип (совместимость с Neon HTTP)
- `gen_random_uuid()::text` для генерации ID
- `lastUpdateId` у Bot — **хранит последний `update_id`** из `getUpdates`, предотвращает дубликаты

---

## 3. Получение сообщений из Telegram

### Проблема
Telegram Bot API в РФ заблокирован — webhook не работает на Vercel.
Решение — **polling через `getUpdates`**.

### Логика Poll API

```
POST /api/bots/:id/poll  { limit?: number }
         │
         ├─ 1. Читаем lastUpdateId из БД
         ├─ 2. offset = lastUpdateId + 1
         ├─ 3. GET /getUpdates?offset=N&limit=100
         ├─ 4. Для каждого update:
         │    ├─ message → upsert в bot_chats + insert в messages
         │    └─ my_chat_member → upsert в bot_chats
         ├─ 5. Сохраняем max(update_id) в lastUpdateId
         └─ 6. Возвращаем { messages: N, chats: N, newOffset: N }
```

### Ключевые моменты

| Момент | Как работает |
|--------|-------------|
| **lastUpdateId** | Хранится в `bots.lastUpdateId`, читается перед каждым poll |
| **Дубликаты** | Невозможны — offset = lastUpdateId + 1 |
| **Время** | Используется `msg.date` из Telegram (Unix timestamp) |
| **Медиа** | Фото: `photoFileId`, документы: `documentFileId` |
| **Чаты** | Авто-создаются при получении сообщения (ON CONFLICT DO NOTHING) |

### Webhook (резервный)

Когда сервер доступен извне (Vercel):
- При создании бота автоматически вызывается `setWebhook`
- URL: `{VERCEL_URL}/api/webhook/telegram/{botId}`
- Webhook handler: upsert чата + save message + relay в AAF

---

## 4. UI — Страница бота `/bots/:id`

### Табы

```
Чаты │ Сообщения │ Команды │ Диагностика │ Настройки
```

### Вкладка «Чаты»
- Список чатов из `bot_chats` (fallback на `messages` если пусто)
- Поиск по названию/username/chatId
- Фильтр по типу (private/group/supergroup/channel)
- Клик → переход к «Сообщения» с `?chat=xxx`
- Кнопка «Обновить из ТГ» → poll API

### Вкладка «Сообщения»
- Dropdown выбора чата (синхронизируется с `?chat=` в URL)
- Фильтр: все / входящие / исходящие
- Bubble-style сообщения (синие — исходящие, белые — входящие)
- Время: `12 апр, 03:14` (день + месяц + время)
- Медиа: `📷 Фото`, `📎 Документ`, `[сообщение]`
- Кнопка «Обновить» — перезагрузить из БД
- Кнопка «Обновить из ТГ» — poll + автообновление
- Поле ввода для отправки сообщения

### Вкладка «Команды»
- Таблица: `/command` + описание
- Inline-редактирование (add/edit/delete)
- Кнопка «Сохранить команды» → `setMyCommands`
- Кнопка «Удалить все» → `deleteMyCommands`

### Вкладка «Диагностика»
- Health check (`getMe` + `getWebhookInfo`)
- Тестовое сообщение (chatId + text)
- История проверок здоровья

### Вкладка «Настройки»
- Основные: имя, webhook URL, toggle enabled
- **Кнопка «Проверить»** — статус подключения бота
- Профиль бота: имя, описание, about (getMyName/setMyName)
- Webhook management: set/delete + статус

---

## 5. API Endpoints

### Bots CRUD
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots` | Список ботов + messageCount |
| POST | `/api/bots` | Создать бота (+ auto setWebhook) |
| GET | `/api/bots/:id` | Получить бота |
| PATCH | `/api/bots/:id` | Обновить бота |
| DELETE | `/api/bots/:id` | Удалить бота (+ очистка зависимостей) |
| POST | `/api/bots/:id/toggle` | Переключить enabled |

### Commands
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots/:id/commands` | Получить команды |
| POST | `/api/bots/:id/commands` | Установить команды |
| DELETE | `/api/bots/:id/commands` | Удалить все команды |

### Profile
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots/:id/profile` | Имя + описание + about |
| PATCH | `/api/bots/:id/profile` | Обновить профиль |

### Chats
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots/:id/chats` | Список чатов (fallback на messages) |
| GET | `/api/bots/:id/chats/:chatId` | Инфо о чате (из Telegram API) |
| POST | `/api/bots/:id/chats/:chatId` | Refresh инфо о чате |

### Messages
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots/:id/messages` | Список сообщений (?chatId=&direction=&limit=&offset=) |
| POST | `/api/bots/:id/messages` | Отправить сообщение |
| DELETE | `/api/bots/:id/messages/:msgId` | Удалить сообщение |

### Poll (NEW)
| Method | Path | Описание |
|--------|------|----------|
| POST | `/api/bots/:id/poll` | Получить обновления из Telegram |

### Webhook
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots/:id/webhook` | Статус webhook |
| POST | `/api/bots/:id/webhook` | Установить webhook |
| DELETE | `/api/bots/:id/webhook` | Удалить webhook |

### Health
| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/bots/:id/health` | Последний статус |
| POST | `/api/bots/:id/health` | Активная проверка |
| GET | `/api/bots/:id/health/history` | История проверок |

---

## 6. Миграции

### Как работает

| Инструмент | Роль |
|------------|------|
| `scripts/init-db.sql` | Полная схема БД (всё включено) |
| `prisma/schema.prisma` | Только для `prisma generate` |
| `prisma/migrations/` | История, не применяется автоматически |
| `vercel.json` | `prisma generate && next build` (без migrate) |

### Текущие миграции

| # | Что делает | Статус |
|---|-----------|--------|
| — | Базовые таблицы (bots, messages, bot_logs, api_keys) | ✅ В init-db.sql |
| 002 | status, lastChecked, lastError в bots | ✅ В init-db.sql |
| 003 | bot_chats, health_checks, расширенный messages, lastUpdateId | ✅ В init-db.sql |

### Деплой с нуля

```bash
# 1. Клонировать репозиторий
git clone https://github.com/Gerondiz/bot_manager.git
cd bot_manager

# 2. Установить зависимости
npm install

# 3. Создать .env (DATABASE_URL, ADMIN_LOGIN, ADMIN_PASSWORD, JWT_SECRET)

# 4. Применить схему БД
npx prisma db execute --file scripts/init-db.sql --schema prisma/schema.prisma

# 5. Сгенерировать клиент и собрать
prisma generate && next build

# 6. Запустить
npm run dev
```

### Добавление новой миграции

1. Создать `prisma/migrations/004_имя/migration.sql`
2. Выполнить: `npx prisma db execute --file prisma/migrations/004_имя/migration.sql --schema prisma/schema.prisma`
3. Зарегистрировать в `_prisma_migrations` (см. `docs/migrations_guide.md`)
4. Обновить `scripts/init-db.sql`
5. Обновить `prisma/schema.prisma`

---

## 7. Telegram Library (`src/lib/telegram.ts`)

### Реализованные функции (30+)

| Категория | Функции |
|-----------|---------|
| **Базовые** | `callTelegramAPI`, `checkBotHealth`, `checkWebhookStatus`, `sendTestMessage` |
| **Команды** | `getMyCommands`, `setMyCommands`, `deleteMyCommands` |
| **Профиль** | `getMyName`, `setMyName`, `getMyDescription`, `setMyDescription`, `getMyShortDescription`, `setMyShortDescription` |
| **Чаты** | `getChatInfo`, `getChatMemberCount`, `getChatAdministrators`, `exportChatInviteLink` |
| **Сообщения** | `sendTextMessage`, `sendPhotoMessage`, `deleteMessage` |
| **Webhook** | `setWebhook`, `deleteWebhook` |
| **Файлы** | `getFile`, `getFileUrl` |
| **Updates** | `getUpdates` |

---

## 8. Хелперы (`src/lib/bots.ts`)

| Функция | Описание |
|---------|----------|
| `getBotToken(id)` | Получить токен бота по ID |
| `getBotById(id)` | Получить бота полностью |
| `upsertBotChat(...)` | Создать/обновить запись в bot_chats |
| `saveIncomingMessage(...)` | Сохранить входящее сообщение |
| `saveOutgoingMessage(...)` | Сохранить исходящее сообщение |

---

## 9. Известные проблемы и решения

### Проблема: БД недоступна без VPN
**Причина:** Neon PostgreSQL заблокирован в РФ.
**Решение:** Включить VPN или использовать прокси.

### Проблема: Telegram API недоступен
**Причина:** `api.telegram.org` заблокирован.
**Решение:** VPN или использовать polling с VPN на сервере.

### Проблема: Ошибка «null value in column id»
**Причина:** INSERT без генерации ID (текстовый PK).
**Решение:** Всегда использовать `gen_random_uuid()::text` или `crypto.randomUUID()`.

### Проблема: Дубликаты сообщений при poll
**Причина:** getUpdates без offset возвращает все обновления.
**Решение:** Хранить `lastUpdateId` в БД, использовать как offset.

---

## 10. Тесты

### Playwright E2E (`tests/test_playwright.js`)
- 11 тестов: auth, bots CRUD, health, logs, UI flow
- Запуск: `npx playwright test tests/test_playwright.js`

### Chats & Messages (`tests/test_chats_messages.js`)
- 7 тестов: bots list, poll, chats, messages, send, health history, UI
- Запуск: `npx playwright test tests/test_chats_messages.js`

---

## 11. Файловая структура

```
bot_manager/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── bots/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── commands/route.ts
│   │   │   │   │   ├── profile/route.ts
│   │   │   │   │   ├── webhook/route.ts
│   │   │   │   │   ├── chats/route.ts
│   │   │   │   │   ├── chats/[chatId]/route.ts
│   │   │   │   │   ├── messages/route.ts
│   │   │   │   │   ├── messages/[msgId]/route.ts
│   │   │   │   │   ├── poll/route.ts          ← NEW
│   │   │   │   │   ├── health/route.ts
│   │   │   │   │   └── health/history/route.ts ← NEW
│   │   │   │   └── route.ts
│   │   │   └── webhook/telegram/[botId]/route.ts
│   │   ├── bots/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx                   ← NEW: табы
│   │   │   │   ├── _ChatsTab.tsx              ← NEW
│   │   │   │   ├── _MessagesTab.tsx           ← NEW
│   │   │   │   ├── _CommandsTab.tsx           ← NEW
│   │   │   │   ├── _DiagnosticsTab.tsx        ← NEW
│   │   │   │   └── _SettingsTab.tsx           ← NEW
│   │   │   └── page.tsx
│   │   └── ...
│   └── lib/
│       ├── telegram.ts                        ← +30 функций
│       ├── bots.ts                            ← NEW
│       ├── db.ts
│       └── error-logger.ts                    ← fixed
├── scripts/
│   ├── init-db.sql                            ← полная схема
│   └── setup-db.sh                            ← авто-настройка
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docs/
│   └── migrations_guide.md
└── project-specs/
    ├── feature_roadmap.md
    └── implementation_plan.md
```
