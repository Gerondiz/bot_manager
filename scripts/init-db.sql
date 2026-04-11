-- Полная схема БД bot_manager
-- Запустить один раз при деплое с нуля в Vercel Postgres / Neon → SQL Editor
-- Включает: базовые таблицы + миграцию 002 (health fields) + миграцию 003 (chats, health_checks, messages)

-- ═══════════════════════════════════════════════════════════
-- 1. Базовые таблицы
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "bots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tgWebhookUrl" TEXT,
    "tgAllowGroups" BOOLEAN NOT NULL DEFAULT false,
    "tgAllowedGroups" TEXT[],
    "aliceSkillId" TEXT,
    "aliceOauthToken" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "direction" TEXT NOT NULL,
    "text" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "bot_logs" (
    "id" TEXT NOT NULL,
    "botId" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════
-- 2. Миграция 002: Health check поля
-- ═══════════════════════════════════════════════════════════

ALTER TABLE "bots" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE "bots" ADD COLUMN IF NOT EXISTS "lastChecked" TIMESTAMP;
ALTER TABLE "bots" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
CREATE INDEX IF NOT EXISTS "idx_bots_status" ON "bots"("status");

-- ═══════════════════════════════════════════════════════════
-- 3. Миграция 003: Расширенные сообщения
-- ═══════════════════════════════════════════════════════════

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "photoFileId" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "documentFileId" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "messageId" INTEGER;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "replyToMsgId" INTEGER;
ALTER TABLE "messages" ALTER COLUMN "text" DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- 4. Миграция 003: Новые таблицы
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "bot_chats" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "botId" TEXT NOT NULL REFERENCES "bots"("id") ON DELETE CASCADE,
  "chatId" TEXT NOT NULL,
  "title" TEXT,
  "type" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "memberCount" INTEGER,
  "firstSeen" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastSeen" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE("botId", "chatId")
);
CREATE INDEX IF NOT EXISTS "idx_bot_chats_bot_lastseen" ON "bot_chats"("botId", "lastSeen");

CREATE TABLE IF NOT EXISTS "health_checks" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "botId" TEXT NOT NULL REFERENCES "bots"("id") ON DELETE CASCADE,
  "healthy" BOOLEAN NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "checkedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_health_checks_bot_checked" ON "health_checks"("botId", "checkedAt");

-- ═══════════════════════════════════════════════════════════
-- 5. Индексы и внешние ключи
-- ═══════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX IF NOT EXISTS "messages_botId_timestamp_idx" ON "messages"("botId", "timestamp");
CREATE INDEX IF NOT EXISTS "messages_botId_chatId_timestamp_idx" ON "messages"("botId", "chatId", "timestamp");
CREATE INDEX IF NOT EXISTS "bot_logs_botId_timestamp_idx" ON "bot_logs"("botId", "timestamp");

-- FK: messages → bots (IF NOT EXISTS safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_botId_fkey' AND table_name = 'messages'
  ) THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_botId_fkey"
      FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- FK: bot_logs → bots (SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bot_logs_botId_fkey' AND table_name = 'bot_logs'
  ) THEN
    ALTER TABLE "bot_logs" ADD CONSTRAINT "bot_logs_botId_fkey"
      FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
