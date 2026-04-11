import { NextResponse } from 'next/server'

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

export interface TelegramBotInfo {
  id: number
  first_name: string
  username: string
  can_join_groups: boolean
  can_read_all_group_messages: boolean
  supports_inline_queries: boolean
}

export interface TelegramWebhookInfo {
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  last_error_date?: number
  last_error_message?: string
  max_connections: number
}

export interface HealthCheckResult {
  healthy: boolean
  botInfo?: TelegramBotInfo
  webhookInfo?: TelegramWebhookInfo
  error?: string
  checkedAt: string
}

/**
 * Вызов метода Telegram Bot API
 */
async function callTelegramAPI(
  token: string,
  method: string,
  // biome-ignore lint/suspicious/noExplicitAny: <any response from Telegram>
  body?: Record<string, any>,
): Promise<any> {
  const url = `${TELEGRAM_API_BASE}${token}/${method}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.description || `Telegram API error: ${response.status}`)
  }

  return data
}

/**
 * Проверка бота через getMe — подтверждает что токен валиден и бот отвечает
 */
export async function checkBotHealth(token: string): Promise<HealthCheckResult> {
  try {
    const data = await callTelegramAPI(token, 'getMe')
    return {
      healthy: true,
      botInfo: data.result,
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      checkedAt: new Date().toISOString(),
    }
  }
}

/**
 * Проверка webhook — получает информацию о текущем webhook статусe
 */
export async function checkWebhookStatus(token: string): Promise<{ webhookInfo?: TelegramWebhookInfo; error?: string }> {
  try {
    const data = await callTelegramAPI(token, 'getWebhookInfo')
    return {
      webhookInfo: data.result,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Отправка тестового сообщения
 */
export async function sendTestMessage(
  token: string,
  chatId: string,
  text: string,
  // biome-ignore lint/suspicious/noExplicitAny: <any response from Telegram>
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const data = await callTelegramAPI(token, 'sendMessage', {
      chat_id: chatId,
      text,
    })
    return {
      success: true,
      messageId: data.result?.message_id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  Bot Commands
// ═══════════════════════════════════════════════════════════════

export interface BotCommand {
  command: string
  description: string
}

export async function getMyCommands(token: string): Promise<BotCommand[]> {
  try {
    const data = await callTelegramAPI(token, 'getMyCommands')
    return data.result || []
  } catch {
    return []
  }
}

export async function setMyCommands(token: string, commands: BotCommand[]): Promise<boolean> {
  try {
    await callTelegramAPI(token, 'setMyCommands', { commands })
    return true
  } catch {
    return false
  }
}

export async function deleteMyCommands(token: string): Promise<boolean> {
  try {
    await callTelegramAPI(token, 'deleteMyCommands')
    return true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════
//  Bot Profile (Name, Description)
// ═══════════════════════════════════════════════════════════════

export async function getMyName(token: string): Promise<string> {
  try {
    const data = await callTelegramAPI(token, 'getMyName')
    return data.result?.name || ''
  } catch {
    return ''
  }
}

export async function setMyName(token: string, name: string): Promise<boolean> {
  try {
    await callTelegramAPI(token, 'setMyName', { name })
    return true
  } catch {
    return false
  }
}

export async function getMyDescription(token: string): Promise<string> {
  try {
    const data = await callTelegramAPI(token, 'getMyDescription')
    return data.result?.description || ''
  } catch {
    return ''
  }
}

export async function setMyDescription(token: string, description: string): Promise<boolean> {
  try {
    await callTelegramAPI(token, 'setMyDescription', { description })
    return true
  } catch {
    return false
  }
}

export async function getMyShortDescription(token: string): Promise<string> {
  try {
    const data = await callTelegramAPI(token, 'getMyShortDescription')
    return data.result?.short_description || ''
  } catch {
    return ''
  }
}

export async function setMyShortDescription(token: string, shortDescription: string): Promise<boolean> {
  try {
    await callTelegramAPI(token, 'setMyShortDescription', { short_description: shortDescription })
    return true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════
//  Chat Management
// ═══════════════════════════════════════════════════════════════

export interface ChatInfo {
  id: number
  type: string
  title?: string
  username?: string
  first_name?: string
  last_name?: string
  member_count?: number
  description?: string
  invite_link?: string
}

export async function getChatInfo(token: string, chatId: string): Promise<ChatInfo | null> {
  try {
    const data = await callTelegramAPI(token, 'getChat', { chat_id: chatId })
    return data.result
  } catch {
    return null
  }
}

export async function getChatMemberCount(token: string, chatId: string): Promise<number> {
  try {
    const data = await callTelegramAPI(token, 'getChatMemberCount', { chat_id: chatId })
    return data.result || 0
  } catch {
    return 0
  }
}

export async function getChatAdministrators(token: string, chatId: string): Promise<any[]> {
  try {
    const data = await callTelegramAPI(token, 'getChatAdministrators', { chat_id: chatId })
    return data.result || []
  } catch {
    return []
  }
}

export async function exportChatInviteLink(token: string, chatId: string): Promise<string | null> {
  try {
    const data = await callTelegramAPI(token, 'exportChatInviteLink', { chat_id: chatId })
    return data.result
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
//  Message Management
// ═══════════════════════════════════════════════════════════════

export interface SendMessageResult {
  success: boolean
  messageId?: number
  error?: string
}

export async function sendTextMessage(
  token: string,
  chatId: string,
  text: string,
  options?: { parseMode?: string; replyToMessageId?: number }
): Promise<SendMessageResult> {
  try {
    const data = await callTelegramAPI(token, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode,
      reply_to_message_id: options?.replyToMessageId,
    })
    return { success: true, messageId: data.result?.message_id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendPhotoMessage(
  token: string,
  chatId: string,
  photo: string,
  caption?: string
): Promise<SendMessageResult> {
  try {
    const data = await callTelegramAPI(token, 'sendPhoto', {
      chat_id: chatId,
      photo,
      caption,
    })
    return { success: true, messageId: data.result?.message_id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deleteMessage(token: string, chatId: string, messageId: number): Promise<boolean> {
  try {
    await callTelegramAPI(token, 'deleteMessage', { chat_id: chatId, message_id: messageId })
    return true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════
//  Webhook Management
// ═══════════════════════════════════════════════════════════════

export async function setWebhook(token: string, url: string): Promise<boolean> {
  try {
    await callTelegramAPI(token, 'setWebhook', { url })
    return true
  } catch {
    return false
  }
}

export async function deleteWebhook(token: string): Promise<boolean> {
  try {
    await callTelegramAPI(token, 'deleteWebhook')
    return true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════
//  File Management
// ═══════════════════════════════════════════════════════════════

export interface TelegramFile {
  file_id: string
  file_unique_id: string
  file_size?: number
  file_path?: string
}

export async function getFile(token: string, fileId: string): Promise<TelegramFile | null> {
  try {
    const data = await callTelegramAPI(token, 'getFile', { file_id: fileId })
    return data.result
  } catch {
    return null
  }
}

export async function getFileUrl(token: string, fileId: string): Promise<string | null> {
  try {
    const file = await getFile(token, fileId)
    if (file?.file_path) {
      return `https://api.telegram.org/file/bot${token}/${file.file_path}`
    }
    return null
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
//  Updates (getUpdates) — polling режим
// ═══════════════════════════════════════════════════════════════

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; username?: string; first_name?: string; last_name?: string }
    chat: { id: number; type: string; title?: string; username?: string; first_name?: string; last_name?: string }
    text?: string
    caption?: string
    photo?: { file_id: string; file_unique_id: string; file_size?: number }[]
    document?: { file_id: string; file_unique_id: string; file_name?: string }
    date: number
    reply_to_message?: { message_id: number }
  }
  my_chat_member?: {
    chat: { id: number; type: string; title?: string; username?: string }
    from: { id: number; username?: string }
    old_chat_member: { status: string }
    new_chat_member: { status: string }
    date: number
  }
}

export async function getUpdates(token: string, options?: { offset?: number; limit?: number; timeout?: number }): Promise<TelegramUpdate[]> {
  try {
    const params = new URLSearchParams()
    if (options?.offset !== undefined) params.set('offset', String(options.offset))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.timeout) params.set('timeout', String(options.timeout))

    const url = `${TELEGRAM_API_BASE}${token}/getUpdates?${params}`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.ok) {
      console.error('getUpdates error:', data.description)
      return []
    }

    return data.result || []
  } catch (error) {
    console.error('getUpdates fetch error:', error)
    return []
  }
}
