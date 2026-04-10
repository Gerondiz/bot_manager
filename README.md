# bot_manager — Telegram Bot Manager

Веб-прослойка для управления Telegram ботами и навыками Алисы.

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Vercel Postgres)
- **Deploy:** Vercel

## Локальная разработка

### 1. Требования

- Node.js 18+
- PostgreSQL (Docker или Vercel Postgres)

### 2. Установка

```bash
npm install

# Генерация секретов
npm run setup

# Настройка .env.local
cp .env.local.example .env.local
# Отредактируйте DATABASE_URL и секреты
```

### 3. База данных

**Вариант A: Docker PostgreSQL**
```bash
docker run -d --name bot-manager-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bot_manager \
  -p 5432:5432 postgres:16

# .env.local:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bot_manager"
```

**Вариант B: Vercel Postgres**
```bash
vercel link
vercel postgresql create
# DATABASE_URL будет установлен автоматически
```

**Миграции:**
```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Запуск

```bash
npm run dev
# http://localhost:3000
# Логин: admin / Пароль: из .env.local
```

## Деплой на Vercel

### 1. Подготовка

```bash
# Подключите репозиторий к Vercel
vercel --prod

# Или через GitHub Integration:
# Vercel Dashboard → New Project → Import Git Repository
```

### 2. Environment Variables (Vercel Dashboard)

Настройте в **Vercel Dashboard → Settings → Environment Variables**:

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `DATABASE_URL` | Строка подключения к Vercel Postgres | `postgresql://...` |
| `ENCRYPTION_KEY` | 32-byte hex ключ для AES-256 | `a1b2c3...` |
| `ADMIN_LOGIN` | Логин администратора | `admin` |
| `ADMIN_PASSWORD` | Сильный пароль | `xK9#mP2!vL5nQ8wR` |
| `JWT_SECRET` | Секрет для JWT (32+ символов) | `random-string-64-chars` |
| `AAF_WEBHOOK_URL` | URL qwen_aaf webhook | `https://aaf.example.com/webhook/v1/event` |
| `AAF_WEBHOOK_SECRET` | Shared secret с qwen_aaf | `random-hex-string` |

### 3. База данных

```bash
# Создать Vercel Postgres:
vercel postgresql create

# Применить миграции:
npx prisma migrate deploy
```

### 4. Проверка

```bash
curl https://your-project.vercel.app/api/bots
# {"bots":[]}
```

## Структура

```
src/
├── app/
│   ├── api/
│   │   ├── auth/login       # JWT аутентификация
│   │   ├── bots/            # Bot CRUD API
│   │   ├── logs/            # Логи (+ /error)
│   │   └── webhook/telegram # Webhook от Telegram
│   ├── login/               # Страница входа
│   ├── dashboard/           # Dashboard
│   └── logs/                # Просмотр логов
├── lib/
│   ├── db.ts                # Prisma client
│   └── error-logger.ts      # Логирование ошибок
└── middleware.ts             # JWT защита страниц
```

## Разделение окружений

| | Development | Production |
|---|---|---|
| **БД** | Local PostgreSQL / Vercel Postgres | Vercel Postgres |
| **ENV** | `.env.local` | Vercel Dashboard |
| **Секреты** | `npm run setup` | Ручная генерация |
| **Миграции** | `prisma migrate dev` | `prisma migrate deploy` |

## Документация

- [Спецификация](project-specs/bot_manager_specs.md)
- [Контракт интеграции с qwen_aaf](../qwen_aaf/project-specs/integration_contract.md)
