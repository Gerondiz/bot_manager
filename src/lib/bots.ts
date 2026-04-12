import { pool } from './db'

/**
 * Получить токен бота по ID
 */
export async function getBotToken(id: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT token FROM bots WHERE id = $1',
    [id]
  )
  return result.rows[0]?.token || null
}

/**
 * Получить бота полностью или null
 */
export async function getBotById(id: string) {
  const result = await pool.query(
    'SELECT * FROM bots WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

/**
 * Upsert чата бота (автоматическое обновление при получении webhook)
 */
export async function upsertBotChat(
  botId: string,
  chat: {
    chatId: string
    title?: string
    type: string
    username?: string
    firstName?: string
    lastName?: string
    memberCount?: number
  }
) {
  await pool.query(
    `INSERT INTO "bot_chats" ("botId", "chatId", title, type, username, "firstName", "lastName", "memberCount", "firstSeen", "lastSeen")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
     ON CONFLICT ("botId", "chatId")
     DO UPDATE SET
       title = COALESCE(EXCLUDED.title, "bot_chats".title),
       username = COALESCE(EXCLUDED.username, "bot_chats".username),
       "firstName" = COALESCE(EXCLUDED."firstName", "bot_chats"."firstName"),
       "lastName" = COALESCE(EXCLUDED."lastName", "bot_chats"."lastName"),
       "lastSeen" = now()`,
    [botId, chat.chatId, chat.title, chat.type, chat.username, chat.firstName, chat.lastName, chat.memberCount]
  )
}

/**
 * Сохранить входящее сообщение в БД
 */
export async function saveIncomingMessage(
  botId: string,
  msg: {
    chatId: string
    userId: string
    username?: string
    firstName?: string
    text?: string
    photoFileId?: string
    documentFileId?: string
    messageId?: number
    replyToMsgId?: number
    date?: number  // Unix timestamp from Telegram
  }
) {
  const ts = msg.date || Math.floor(Date.now() / 1000)
  return pool.query(
    `INSERT INTO messages (id, "botId", "chatId", "userId", username, "firstName", direction, text, "photoFileId", "documentFileId", "messageId", "replyToMsgId", timestamp)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'INCOMING', $6, $7, $8, $9, $10, to_timestamp($11))`,
    [botId, msg.chatId, msg.userId, msg.username, msg.firstName, msg.text, msg.photoFileId, msg.documentFileId, msg.messageId, msg.replyToMsgId, ts]
  )
}

/**
 * Сохранить исходящее сообщение в БД
 */
export async function saveOutgoingMessage(
  botId: string,
  msg: {
    chatId: string
    userId?: string
    text?: string
    messageId?: number
  }
) {
  return pool.query(
    `INSERT INTO messages (id, "botId", "chatId", "userId", direction, text, "messageId", timestamp)
     VALUES (gen_random_uuid(), $1, $2, $3, 'OUTGOING', $4, $5, now()) RETURNING *`,
    [botId, msg.chatId, msg.userId || '', msg.text, msg.messageId]
  )
}
