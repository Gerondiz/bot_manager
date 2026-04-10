-- Add migration script for bot health check fields

ALTER TABLE bots ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE bots ADD COLUMN IF NOT EXISTS "lastChecked" TIMESTAMP;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS "lastError" TEXT;

-- Добавляем индекс для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
