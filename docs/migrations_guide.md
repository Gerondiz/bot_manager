# Миграции БД — Инструкция

## Как работает миграция в этом проекте

### Архитектура

```
┌──────────────────────────────────────────────────────────┐
│  scripts/init-db.sql    — полная схема (всё включено)    │
│  prisma/schema.prisma   — Prisma для генерации клиента   │
│  prisma/migrations/     — только для истории/отладки     │
│  vercel.json            — НЕ запускает migrate deploy    │
└──────────────────────────────────────────────────────────┘
```

### Ключевой принцип

**Prisma НЕ управляет миграциями.** Prisma используется только для:
- `prisma generate` — генерация Prisma Client
- `prisma db execute --file ...` — выполнение SQL-скриптов

Схема БД управляется через **ручные SQL-скрипты**.

---

## Создание таблиц с нуля (новый деплой)

### Вариант 1: Через Neon Console (рекомендуется)

1. Откройте Neon Console → SQL Editor
2. Скопируйте содержимое `scripts/init-db.sql`
3. Запустите весь скрипт целиком

### Вариант 2: Через CLI

```bash
cd bot_manager

# Убедитесь что DATABASE_URL установлен
export DATABASE_URL="postgresql://..."

# Выполните init-db.sql
npx prisma db execute --file scripts/init-db.sql --schema prisma/schema.prisma
```

### Вариант 3: Через psql

```bash
psql "$DATABASE_URL" -f scripts/init-db.sql
```

> **init-db.sql** использует `CREATE TABLE IF NOT EXISTS` и `ADD COLUMN IF NOT EXISTS` —
> безопасен для повторного запуска.

---

## Добавление новой миграции

### Шаг 1: Написать SQL

Создайте файл:
```
prisma/migrations/004_имя_миграции/migration.sql
```

Содержимое — SQL, который модифицирует БД. Используйте `IF NOT EXISTS` где возможно.

### Шаг 2: Применить SQL к БД

```bash
npx prisma db execute --file prisma/migrations/004_имя_миграции/migration.sql --schema prisma/schema.prisma
```

### Шаг 3: Зарегистрировать миграцию в БД

```bash
npx prisma db execute --stdin --schema prisma/schema.prisma << 'EOSQL'
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  'e3b0c44298fc1c149afbf4c8996fb924',
  now(),
  '004_имя_миграции',
  '[]',
  NULL,
  now(),
  1
);
EOSQL
```

> `checksum` можно оставить как есть — Prisma при `migrate deploy` его проверяет,
> но мы не используем `migrate deploy`, поэтому значение не критично.

### Шаг 4: Обновить `scripts/init-db.sql`

Добавьте изменения из миграции в `init-db.sql` — чтобы новые деплои с нуля работали.

### Шаг 5: Обновить `prisma/schema.prisma`

Если миграция добавляет новые поля/таблицы — добавьте их в schema.prisma.

---

## Почему не `prisma migrate deploy`?

1. **Текст ID, не UUID**: таблицы созданы с `id TEXT`, а Prisma по умолчанию использует `@default(uuid())`
2. **Существующая БД**: миграции через `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` безопасны для существующих данных
3. **Полный контроль**: мы видим и контролируем каждый SQL-запрос
4. **Vercel serverless**: `prisma migrate deploy` может падать из-за таймаутов или FAILED статусов

### Что будет если запустить `prisma migrate deploy`?

- Если в `_prisma_migrations` есть запись со статусом `MigrationFailed` — **не применит новые миграции**
- Prisma сверяет checksum файлов с БД — любые расхождения = ошибка
- На Vercel билд падает → деплой не проходит

---

## Проверка состояния БД

### Посмотреть применённые миграции:
```bash
npx prisma db execute --stdin --schema prisma/schema.prisma << 'EOSQL'
SELECT migration_name, finished_at, applied_steps_count
FROM "_prisma_migrations"
ORDER BY started_at;
EOSQL
```

### Посмотреть таблицы:
```bash
npx prisma db execute --stdin --schema prisma/schema.prisma << 'EOSQL'
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
EOSQL
```

### Удалить запись о неудачной миграции:
```bash
npx prisma db execute --stdin --schema prisma/schema.prisma << 'EOSQL'
DELETE FROM "_prisma_migrations"
WHERE migration_name = '003_add_chats_messages_health' AND finished_at IS NULL;
EOSQL
```

---

## Типы данных

| Prisma type | Реальный тип в БД |
|-------------|-------------------|
| `String @id` | `TEXT NOT NULL` |
| `DateTime` | `TIMESTAMP(3)` |
| `String?` | `TEXT` |
| `Int?` | `INTEGER` |
| `Boolean` | `BOOLEAN` |
| `String[]` | `TEXT[]` |
| `Json?` | `JSONB` |

> Все колонки используют `@map("columnName")` для camelCase → snake_case совместимости.

---

## Vercel deploy

```json
{
  "buildCommand": "prisma generate && next build"
}
```

- `prisma migrate deploy` **НЕ выполняется** — миграции применяются вручную
- `prisma generate` — генерирует Prisma Client из schema.prisma
- `next build` — собирает Next.js приложение

### Порядок действий при деплое:

1. `git push` → Vercel запускает билд
2. Если есть новые миграции — **применить их вручную** через Neon Console
3. Зарегистрировать миграцию в `_prisma_migrations`

---

## Текущие миграции

| # | Файл | Что делает | Применена |
|---|------|------------|-----------|
| — | `scripts/init-db.sql` | Базовые таблицы: bots, messages, bot_logs, api_keys | ✅ Всегда |
| 002 | `002_add_bot_health_fields` | status, lastChecked, lastError в bots | ✅ В init-db.sql |
| 003 | `003_add_chats_messages_health` | bot_chats, health_checks, расширение messages | ✅ Применена |
