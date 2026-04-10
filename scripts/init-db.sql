-- SQL для создания таблиц bot_manager
-- Запустить в Vercel Storage → Postgres → SQL Editor

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
    "text" TEXT NOT NULL,
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

CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX "messages_botId_timestamp_idx" ON "messages"("botId", "timestamp");
CREATE INDEX "bot_logs_botId_timestamp_idx" ON "bot_logs"("botId", "timestamp");

ALTER TABLE "messages" ADD CONSTRAINT "messages_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bot_logs" ADD CONSTRAINT "bot_logs_botId_fkey" FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
