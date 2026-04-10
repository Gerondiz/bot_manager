import { pool } from '@/lib/db'

/**
 * Middleware для логирования ошибок приложения.
 * Перехватывает console.error и записывает в БД.
 */
export function errorLogger() {
  const originalError = console.error
  const logQueue: Array<Promise<unknown>> = []

  console.error = async function (...args: unknown[]) {
    const message = args.map(String).join(' ').slice(0, 1000)
    const timestamp = new Date()

    // Вызываем оригинальный console.error
    originalError.apply(console, args)

    // Ставим в очередь (не блокируем основной поток)
    logQueue.push(
      pool
        .query(
          `INSERT INTO bot_logs ("botId", level, message, context, timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            null, // Системная ошибка
            'ERROR',
            message,
            JSON.stringify({
              source: 'console.error',
              timestamp: timestamp.toISOString(),
            }),
            timestamp,
          ]
        )
        .catch((dbError) => {
          // Если БД недоступна — логируем в консоль
          originalError.apply(console, ['[DB Log Error]', dbError])
        })
    )
  }

  // Возвращаем функцию для ожидания очереди
  return async () => {
    await Promise.allSettled(logQueue)
  }
}
