import { neonConfig, Pool } from '@neondatabase/serverless'
import { PrismaNeonHTTP } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

// Используем Neon HTTP драйвер вместо WebSocket (порт 443)
// neonConfig.fetchEndpoint — для Edge/Serverless окружений
const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

// Для serverless (Vercel) используем встроенный fetch
// Для локальной разработки — ws если доступен
const isServerless = typeof process !== 'undefined' && process.env.VERCEL

let prisma: PrismaClient

if (isServerless) {
  // Vercel: используем Neon HTTP через fetch
  neonConfig.fetchEndpoint = connectionString
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeonHTTP(pool)
  prisma = new PrismaClient({ adapter })
} else {
  // Локально: стандартный Prisma клиент
  prisma = new PrismaClient()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
