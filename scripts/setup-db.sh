#!/usr/bin/env bash
# setup-db.sh — Создание/обновление БД для bot_manager
# Запускать после деплоя или при инициализации с нуля
# Idempotent — безопасен для повторного запуска

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

echo "🔧 Applying database schema..."

# Выполнить init-db.sql (создаст все таблицы если их нет)
npx prisma db execute --file scripts/init-db.sql --schema prisma/schema.prisma
echo "✅ Base schema applied"

# Зарегистрировать миграции в _prisma_migrations (если ещё не зарегистрированы)
npx prisma db execute --stdin --schema prisma/schema.prisma << 'EOSQL'
-- Миграция 002
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT gen_random_uuid()::text, 'abc123', now(), '002_add_bot_health_fields', '[]', NULL, now(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '002_add_bot_health_fields');

-- Миграция 003
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT gen_random_uuid()::text, 'abc123', now(), '003_add_chats_messages_health', '[]', NULL, now(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '003_add_chats_messages_health');
EOSQL

echo "✅ Migrations registered"
echo "🎉 Database setup complete!"
