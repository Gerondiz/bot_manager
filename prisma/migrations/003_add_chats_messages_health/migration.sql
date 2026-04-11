-- Migration 003: Add BotChat, HealthCheck, expand Message

-- 1. Add new columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "photoFileId" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "documentFileId" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "messageId" INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "replyToMsgId" INTEGER;
-- Make text nullable (was NOT NULL before)
ALTER TABLE messages ALTER COLUMN "text" DROP NOT NULL;

-- 2. Create bot_chats table
CREATE TABLE IF NOT EXISTS "bot_chats" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "botId" TEXT NOT NULL REFERENCES bots("id") ON DELETE CASCADE,
  "chatId" TEXT NOT NULL,
  title TEXT,
  type TEXT NOT NULL,
  username TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "memberCount" INTEGER,
  "firstSeen" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastSeen" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE("botId", "chatId")
);
CREATE INDEX IF NOT EXISTS idx_bot_chats_bot_lastseen ON "bot_chats"("botId", "lastSeen");

-- 3. Create health_checks table
CREATE TABLE IF NOT EXISTS "health_checks" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "botId" TEXT NOT NULL REFERENCES bots("id") ON DELETE CASCADE,
  healthy BOOLEAN NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  "checkedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS idx_health_checks_bot_checked ON "health_checks"("botId", "checkedAt");
