import { neonConfig, Pool } from '@neondatabase/serverless'

// Neon HTTP driver — работает через обычный HTTPS порт 443
// poolQueryViaFetch = true — ключевая настройка для работы через HTTP
neonConfig.useSecureWebSocket = false
neonConfig.poolQueryViaFetch = true
neonConfig.pipelineTLS = false

const connectionString =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_PRISMA_URL is not set')
}

export const pool = new Pool({ connectionString })
