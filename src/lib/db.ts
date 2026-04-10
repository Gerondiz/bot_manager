import { neonConfig, Pool } from '@neondatabase/serverless'
import { PrismaNeonHttp } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

// Neon HTTP driver — работает через обычный HTTPS порт 443
// poolQueryViaFetch = true — ключевая настройка для работы через HTTP

const connectionString =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_PRISMA_URL is not set')
}

// Принудительно HTTP mode — никаких WebSocket
neonConfig.useSecureWebSocket = false
neonConfig.poolQueryViaFetch = true
neonConfig.pipelineTLS = false

const pool = new Pool({ connectionString })
const adapter = new PrismaNeonHttp(pool)
const prisma = new PrismaClient({ adapter })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
