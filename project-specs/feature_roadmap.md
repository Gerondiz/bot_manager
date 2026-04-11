# Bot Manager — Функциональный план

> Обновлено: 11 апреля 2026

---

## 1. Текущий функционал (реализовано ✅)

### Управление ботами
- [x] CRUD ботов (создание, чтение, обновление, удаление)
- [x] Включение/отключение бота (toggle)
- [x] Статус online/offline (последняя проверка вручную через POST /health)

### Диагностика
- [x] Health check (`getMe` + `getWebhookInfo`) — ручная проверка
- [x] Тестовое сообщение (отправка в указанный chatId)
- [x] Просмотр последнего статуса в БД

### Telegram Webhook
- [x] Приём входящих webhook от Telegram (`POST /api/webhook/telegram/:botId`)
- [x] Сохранение входящих сообщений в БД
- [ ] **Пересылка в qwen_aaf** (код есть, закомментирован)

### Логи
- [x] Просмотр логов с фильтрацией по уровню
- [x] Отдельный endpoint для ошибок

### Интеграция AAF
- [x] Поле `webhookUrl` у бота
- [ ] Отправка событий в AAF (TODO)
- [ ] HMAC верификация (TODO)

### UI
- [x] Login + auth guards
- [x] Dashboard с реальными счётчиками
- [x] Список ботов с поиском
- [x] Страница бота с диагностикой
- [x] Страница логов
- [x] Страница MTProto прокси
- [x] Responsive navbar (hamburger на мобиле)

### MTProto прокси
- [x] Парсинг списка из GitHub
- [x] Проверка доступности
- [x] Копирование ссылки, открытие в Telegram

---

## 2. Полный список доступного функционала Telegram Bot API

### 2.1 Управление ботом
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `getMe` | Информация о боте | ✅ Реализовано |
| `getMyName` | Имя бота для текущего языка | 🟡 Желательно |
| `setMyName` | Изменить имя бота | 🟡 Желательно |
| `getMyDescription` | Описание бота | ⚪ Опционально |
| `setMyDescription` | Изменить описание | ⚪ Опционально |
| `getMyShortDescription` | Короткое описание (about) | ⚪ Опционально |
| `setMyShortDescription` | Изменить about | ⚪ Опционально |
| `getMyCommands` | Список команд бота | 🟡 Желательно |
| `setMyCommands` | Установить команды бота | 🟡 Желательно |
| `deleteMyCommands` | Удалить команды | ⚪ Опционально |
| `getChatMenuButton` | Кнопка меню бота | ⚪ Опционально |
| `setChatMenuButton` | Установить кнопку меню | ⚪ Опционально |

### 2.2 Управление сообщениями
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `sendMessage` | Отправить текст | ✅ Реализовано (тест) |
| `sendPhoto` | Отправить фото | 🔴 Полезно |
| `sendDocument` | Отправить файл | 🔴 Полезно |
| `sendVideo` | Отправить видео | ⚪ Опционально |
| `sendAudio` | Отправить аудио | ⚪ Опционально |
| `sendVoice` | Отправить голосовое | ⚪ Опционально |
| `sendVideoNote` | Видеозаметка | ⚪ Опционально |
| `sendAnimation` | GIF/анимация | ⚪ Опционально |
| `sendSticker` | Стикеры | ⚪ Опционально |
| `sendLocation` | Геолокация | ⚪ Опционально |
| `sendContact` | Контакт | ⚪ Опционально |
| `sendPoll` | Опрос | ⚪ Опционально |
| `copyMessage` | Копировать сообщение | ⚪ Опционально |
| `forwardMessage` | Переслать сообщение | ⚪ Опционально |
| `editMessageText` | Редактировать текст | ⚪ Опционально |
| `editMessageCaption` | Редактировать подпись | ⚪ Опционально |
| `deleteMessage` | Удалить сообщение | 🔴 Полезно |

### 2.3 Управление чатами
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `getChat` | Информация о чате/группе | 🟡 Желательно |
| `getChatAdministrators` | Список админов группы | 🟡 Желательно |
| `getChatMemberCount` | Количество участников | 🟡 Желательно |
| `getChatMember` | Статус участника | ⚪ Опционально |
| `leaveChat` | Покинуть чат | ⚪ Опционально |
| `banChatMember` | Забанить участника | 🔴 Опционально |
| `unbanChatMember` | Разбанить | ⚪ Опционально |
| `restrictChatMember` | Ограничить права | ⚪ Опционально |
| `promoteChatMember` | Повысить до админа | ⚪ Опционально |
| `setChatAdministratorCustomTitle` | Кастомный титул админа | ⚪ Опционально |
| `exportChatInviteLink` | Получить ссылку-приглашение | 🔴 Опционально |
| `createChatInviteLink` | Создать одноразовую ссылку | ⚪ Опционально |
| `editChatInviteLink` | Редактировать ссылку | ⚪ Опционально |
| `revokeChatInviteLink` | Отозвать ссылку | ⚪ Опционально |
| `approveChatJoinRequest` | Одобрить заявку | 🔴 Опционально |
| `decline ChatJoinRequest` | Отклонить заявку | 🔴 Опционально |
| `setChatTitle` | Изменить название группы | ⚪ Опционально |
| `setChatDescription` | Изменить описание группы | ⚪ Опционально |
| `setChatPhoto` | Изменить фото группы | ⚪ Опционально |
| `deleteChatPhoto` | Удалить фото группы | ⚪ Опционально |
| `pinChatMessage` | Закрепить сообщение | 🔴 Опционально |
| `unpinChatMessage` | Открепить сообщение | 🔴 Опционально |
| `unpinAllChatMessages` | Открепить все | ⚪ Опционально |

### 2.4 Управление webhook
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `getWebhookInfo` | Статус webhook | ✅ Реализовано |
| `setWebhook` | Установить webhook URL | 🟡 Желательно |
| `deleteWebhook` | Удалить webhook | 🟡 Желательно |

### 2.5 Inline-режим
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `answerInlineQuery` | Ответ на inline-запрос | ⚪ Опционально |
| `answerWebAppQuery` | Ответ WebApp | ⚪ Опционально |

### 2.6 Платежи
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `sendInvoice` | Выставить счёт | ⚪ Опционально |
| `createInvoiceLink` | Ссылка на оплату | ⚪ Опционально |
| `answerShippingQuery` | Ответ на shipping | ⚪ Опционально |
| `answerPreCheckoutQuery` | Ответ на pre-checkout | ⚪ Опционально |
| `getStarTransactions` | Транзакции Stars | ⚪ Опционально |
| `refundStarPayment` | Возврат Stars | ⚪ Опционально |

### 2.7 Стикеры и кастомизация
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `getStickerSet` | Информация о наборе | ⚪ Опционально |
| `uploadStickerFile` | Загрузить стикер | ⚪ Опционально |
| `createNewStickerSet` | Создать набор | ⚪ Опционально |

### 2.8 Forum/Topics (супергруппы)
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `createForumTopic` | Создать тему | ⚪ Опционально |
| `editForumTopic` | Редактировать тему | ⚪ Опционально |
| `closeForumTopic` | Закрыть тему | ⚪ Опционально |
| `reopenForumTopic` | Открыть тему | ⚪ Опционально |
| `deleteForumTopic` | Удалить тему | ⚪ Опционально |
| `unpinAllForumTopicMessages` | Открепить все в теме | ⚪ Опционально |

### 2.9 Business API
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `getBusinessConnection` | Бизнес-подключение | ⚪ Опционально |

### 2.10 Updates
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `getUpdates` | Получить обновления (long polling) | 🟡 Желательно |
| `setWebhook` | Переключиться на webhook | 🟡 Желательно |

### 2.11 Файлы
| Метод | Описание | Приоритет |
|-------|----------|-----------|
| `getFile` | Получить файл по file_id | 🔴 Полезно |
| `getFileURL` (не API) | Прямая ссылка на файл | 🔴 Полезно |

---

## 3. Рекомендуемый функционал для реализации

### 3.1 Карточка бота — показать статус online/offline ✅ ПЕРВЫЙ ШАГ

На карточке бота в `/bots` показывать актуальный статус:
- Зелёный кружок `online` (если последняя проверка OK)
- Серый кружок `unknown` (если не проверялся)
- Красный кружок `error` (если ошибка)

API: `GET /api/bots/:id/health` уже возвращает статус.

### 3.2 Команды бота (Bot Commands)

**UI:** На странице бота — секция «Команды» с таблицей.

**API:**
```
GET    /api/bots/:id/commands          — Получить список команд
POST   /api/bots/:id/commands          — Установить команды (body: [{command, description}])
DELETE /api/bots/:id/commands          — Удалить все команды
```

**Telegram API:** `getMyCommands`, `setMyCommands`, `deleteMyCommands`

### 3.3 Список групп/чатов бота

**UI:** На странице бота — вкладка «Чаты» с таблицей групп.

**API:**
```
GET    /api/bots/:id/chats             — Список чатов (кэшированных из входящих сообщений)
GET    /api/bots/:id/chats/:chatId     — Информация о чате
POST   /api/bots/:id/chats/:chatId/message — Отправить сообщение в чат
```

**Данные:** Хранить уникальные chatId из входящих сообщений. Для деталей чата — `getChat`.

> ⚠️ Telegram Bot API **не даёт** список всех чатов где бот состоит. Нужно вести свой реестр на основе входящих сообщений.

### 3.4 История сообщений бота

**UI:** На странице бота — вкладка «Сообщения» с пагинацией и фильтром (входящие/исходящие).

**API:**
```
GET    /api/bots/:id/messages          — Список сообщений (pagination, direction filter)
GET    /api/bots/:id/messages/:msgId   — Одно сообщение
POST   /api/bots/:id/messages          — Отправить сообщение (chatId, text, parseMode)
DELETE /api/bots/:id/messages/:msgId   — Удалить сообщение из Telegram
```

**Telegram API:** `sendMessage`, `deleteMessage`, `copyMessage`

### 3.5 Управление webhook

**UI:** На странице бота — секция Webhook с кнопками.

**API:**
```
POST   /api/bots/:id/webhook           — Установить webhook URL
DELETE /api/bots/:id/webhook           — Удалить webhook
GET    /api/bots/:id/webhook           — Текущий webhook status
```

**Telegram API:** `setWebhook`, `deleteWebhook`, `getWebhookInfo`

### 3.6 Отправка сообщений (расширенная)

**UI:** На странице бота — форма отправки с выбором типа контента.

**API:**
```
POST   /api/bots/:id/messages          — Расширенная отправка
       Body: { chatId, text, parseMode?, photo?, document?, replyToMessageId? }
```

**Telegram API:** `sendMessage`, `sendPhoto`, `sendDocument`

### 3.7 Автоматическая проверка здоровья

**UI:** Toggle «Автопроверка каждые N минут»

**API:**
```
POST   /api/bots/:id/health/schedule   — Включить автопроверку (interval minutes)
DELETE /api/bots/:id/health/schedule   — Отключить автопроверку
GET    /api/bots/:id/health/history    — История последних проверок
```

**Реализация:** Cron job или Vercel Cron (serverless) — периодический вызов health check.

### 3.8 Пересылка webhook в AAF

**UI:** Toggle «Пересылать события в AAF»

**API:**
```
POST   /api/webhook/telegram/:botId    — Уже принимает, нужно раскомментировать relay
```

**Реализация:** Раскомментировать код в webhook route, добавить HMAC подпись.

### 3.9 Управление именем и описанием бота

**UI:** Поля на странице настроек бота.

**API:**
```
GET    /api/bots/:id/profile           — getMyName + getMyDescription
PATCH  /api/bots/:id/profile           — setMyName / setMyDescription
```

### 3.10 Экспорт/импорт бота

**API:**
```
GET    /api/bots/:id/export            — JSON экспорт всех настроек + commands
POST   /api/bots/import                — Импорт из JSON
```

### 3.11 Статистика бота

**UI:** На dashboard или отдельная страница.

**API:**
```
GET    /api/bots/:id/stats             — Статистика: сообщений за день/неделю, уникальные чаты
GET    /api/bots/stats                 — Общая статистика всех ботов
```

---

## 4. Приоритеты реализации

| # | Функция | Сложность | Ценность | Порядок |
|---|---------|-----------|----------|---------|
| 1 | Статус online/offline на карточке | 🟢 Низкая | 🔴 Высокая | **Сейчас** |
| 2 | Управление командами бота | 🟢 Низкая | 🔴 Высокая | **Далее** |
| 3 | История сообщений + отправка | 🟡 Средняя | 🔴 Высокая | 3 |
| 4 | Список чатов бота | 🟡 Средняя | 🔴 Высокая | 4 |
| 5 | Управление webhook (set/delete) | 🟢 Низкая | 🟡 Средняя | 5 |
| 6 | Пересылка webhook в AAF | 🟡 Средняя | 🔴 Высокая | 6 |
| 7 | Расширенная отправка (фото, документы) | 🟡 Средняя | 🟡 Средняя | 7 |
| 8 | Имя/описание бота | 🟢 Низкая | 🟡 Средняя | 8 |
| 9 | Автопроверка здоровья | 🟡 Средняя | 🟡 Средняя | 9 |
| 10 | Статистика бота | 🟡 Средняя | 🟡 Средняя | 10 |
| 11 | Экспорт/импорт | 🟢 Низкая | ⚪ Низкая | 11 |

---

## 5. Архитектурные принципы

### 5.1 Каждый функционал — отдельный API endpoint

```
/api/bots/:id/commands
/api/bots/:id/messages
/api/bots/:id/chats
/api/bots/:id/webhook
/api/bots/:id/profile
/api/bots/:id/health/schedule
```

### 5.2 Библиотека Telegram API (`src/lib/telegram.ts`)

Расширить текущую библиотеку функциями-обёртками:

```typescript
export async function getBotCommands(token: string) → BotCommand[]
export async function setBotCommands(token: string, commands) → boolean
export async function getChatInfo(token: string, chatId) → ChatInfo
export async function sendMessageToChat(token: string, chatId, text, options) → Message
export async function setBotWebhook(token: string, url) → boolean
export async function getBotProfile(token: string) → BotProfile
```

### 5.3 Кэширование данных чатов

Создать таблицу `bot_chats`:
```sql
CREATE TABLE bot_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "botId" uuid REFERENCES bots(id),
  "chatId" text NOT NULL,
  title text,
  type text,  -- private, group, supergroup, channel
  username text,
  "firstSeen" timestamptz DEFAULT now(),
  "lastSeen" timestamptz DEFAULT now(),
  UNIQUE("botId", "chatId")
);
```

Заполняется автоматически при получении webhook от Telegram.

---

## 6. Предложения по архитектуре

### 6.1 WebSocket для real-time обновлений

Вместо polling — WebSocket подключение для:
- Real-time обновление логов
- Уведомления о новых сообщениях
- Обновление статуса бота

### 6.2 Очередь задач (для автопроверки)

Vercel serverless не поддерживает cron. Варианты:
- qwen_aaf как orchestrator с internal scheduler

### 6.3 Шифрование токенов

Перед пушем в production:
- AES-256-GCM шифрование токенов ботов
- `ENCRYPTION_KEY` уже в `.env`
