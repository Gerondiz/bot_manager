# Bot Manager — План реализации v2

> Обновлено: 11 апреля 2026

## Цель
Превратить bot_manager в полноценную панель управления ботами:
- Чаты бота (список + просмотр)
- История сообщений (хранение в БД)
- Управление командами бота
- Настройки бота (имя, описание, webhook)
- Всё доступно и через UI и через API

---

## Этап 1: База данных

### 1.1 Новая модель `BotChat`
Отслеживание чатов бота (Telegram не даёт API для списка чатов):

```prisma
model BotChat {
  id         String   @id @default(uuid())
  botId      String
  chatId     String   // Telegram chat ID (может быть отрицательным для групп)
  title      String?
  type       String   // private, group, supergroup, channel
  username   String?
  firstName  String?
  lastName   String?
  photo      String?  // file_id
  memberCount Int?
  firstSeen  DateTime @default(now())
  lastSeen   DateTime @default(now())
  bot        Bot      @relation(fields: [botId], references: [id])

  @@unique([botId, chatId])
  @@index([botId, lastSeen])
  @@map("bot_chats")
}
```

### 1.2 Расширение модели `Message`
Добавить поля для полноценного хранения:

```prisma
model Message {
  id            String   @id @default(uuid())
  botId         String
  chatId        String
  userId        String
  username      String?
  firstName     String?
  direction     Direction
  text          String?  @db.Text
  photoFileId   String?
  documentFileId String?
  messageId     Int?     // Telegram message ID
  replyToMsgId  Int?
  timestamp     DateTime @default(now())

  bot           Bot      @relation(fields: [botId], references: [id])

  @@index([botId, timestamp])
  @@index([botId, chatId, timestamp])
  @@map("messages")
}
```

### 1.3 Health Check History
```prisma
model HealthCheck {
  id        String   @id @default(uuid())
  botId     String
  healthy   Boolean
  error     String?  @db.Text
  checkedAt DateTime @default(now())
  bot       Bot      @relation(fields: [botId], references: [id])

  @@index([botId, checkedAt])
  @@map("health_checks")
}
```

---

## Этап 2: Telegram API Library (`src/lib/telegram.ts`)

Новые функции:

```typescript
// Команды
getMyCommands(token) → BotCommand[]
setMyCommands(token, commands) → boolean
deleteMyCommands(token) → boolean

// Профиль бота
getMyName(token) → string
setMyName(token, name) → boolean
getMyDescription(token) → string
setMyDescription(token, desc) → boolean
getMyShortDescription(token) → string
setMyShortDescription(token, desc) → boolean

// Чаты
getChatInfo(token, chatId) → ChatInfo
getChatAdministrators(token, chatId) → ChatMember[]
getChatMemberCount(token, chatId) → number
exportChatInviteLink(token, chatId) → string
pinChatMessage(token, chatId, msgId) → boolean
unpinChatMessage(token, chatId, msgId?) → boolean

// Сообщения
deleteMessage(token, chatId, msgId) → boolean
sendPhoto(token, chatId, photo, caption?) → Message
sendDocument(token, chatId, document, caption?) → Message

// Webhook
setWebhook(token, url) → boolean
deleteWebhook(token) → boolean

// Файлы
getFile(token, fileId) → File
getFileUrl(token, fileId) → string
```

---

## Этап 3: API Endpoints

### Команды
```
GET    /api/bots/:id/commands
POST   /api/bots/:id/commands          body: { commands: [{command, description}] }
DELETE /api/bots/:id/commands
```

### Профиль бота
```
GET    /api/bots/:id/profile           → { name, description, shortDescription }
PATCH  /api/bots/:id/profile           body: { name?, description?, shortDescription? }
```

### Webhook
```
GET    /api/bots/:id/webhook           → { url, pending_count, last_error }
POST   /api/bots/:id/webhook           body: { url }
DELETE /api/bots/:id/webhook
```

### Чаты
```
GET    /api/bots/:id/chats             → { chats: [...], total }
GET    /api/bots/:id/chats/:chatId     → { chat: {...} } (fresh from Telegram API)
POST   /api/bots/:id/chats/:chatId/info → refresh chat info from Telegram
```

### Сообщения
```
GET    /api/bots/:id/messages          ?chatId=&direction=&limit=&offset=
POST   /api/bots/:id/messages          body: { chatId, text, parseMode?, photo?, document?, replyToMessageId? }
DELETE /api/bots/:id/messages/:msgId   (удаляет из Telegram и из БД)
```

### История здоровья
```
GET    /api/bots/:id/health/history    ?limit=50
```

---

## Этап 4: Обновление Webhook Handler

`POST /api/webhook/telegram/:botId` теперь должен:
1. Сохранять сообщение в `messages`
2. **Upsert** в `bot_chats` (создать или обновить `lastSeen`)
3. Заполнять `firstName`, `lastName`, `username` из данных Telegram
4. Relay в AAF (раскомментировать)

---

## Этап 5: UI — Страница бота `/bots/:id`

### Табы:
```
┌─────────────────────────────────────────────┐
│ Чаты │ Сообщения │ Команды │ Диагностика │ Настройки │
└─────────────────────────────────────────────┘
```

### Вкладка «Чаты»
- Таблица: тип иконка, название, username, тип, последнее сообщение, кол-во участников
- Клик → переход к просмотру чата
- Кнопка «Обновить инфо» → getChat

### Вкладка «Сообщения» (чат-вью)
- Выбор чата из dropdown
- Список сообщений (bubble-style)
- Поле ввода для отправки
- Фильтр: все / входящие / исходящие

### Вкладка «Команды»
- Таблица: команда, описание
- Кнопки: добавить, удалить, сохранить все
- Inline editing

### Вкладка «Диагностика» (существующая)
- Health check + test message
- Добавить историю проверок

### Вкладка «Настройки»
- Общие настройки (имя бота, webhookUrl)
- **Новое:** Имя бота в Telegram (getMyName/setMyName)
- **Новое:** Описание (getMyDescription/setMyDescription)
- **Новое:** Webhook management (set/delete)

---

## Этап 6: Обновление `/bots` (список)

- Клик по карточке → переход на `/bots/:id` (вкладка Чаты)
- Текущие кнопки (Настроить, Toggle, Удалить) → в dropdown или hover

---

## Приоритет реализации

1. ✅ Миграции БД (BotChat, расширенный Message, HealthCheck)
2. ✅ Обновить webhook handler для трекинга чатов
3. ✅ Telegram API library (commands, profile, chats, messages)
4. ✅ API endpoints (commands, profile, webhook, chats, messages)
5. ✅ UI: табы на странице бота
6. ✅ UI: список чатов
7. ✅ UI: просмотр чата (messenger)
8. ✅ UI: команды бота
9. ✅ UI: профиль бота + webhook management
10. ✅ Обновить карточку бота → клик → detail page
