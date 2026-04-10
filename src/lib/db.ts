import { neonConfig, Pool } from '@neondatabase/serverless'

// Neon HTTP driver — работает через HTTPS порт 443
neonConfig.useSecureWebSocket = false
neonConfig.poolQueryViaFetch = true
neonConfig.pipelineTLS = false

const connectionString =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  ''

export const pool = new Pool({ connectionString })
