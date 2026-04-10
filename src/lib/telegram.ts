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
): Promise<any> {
  const url = `${TELEGRAM_API_BASE}${token}/${method}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  // biome-ignore lint/suspicious/noExplicitAny: <parseMode can vary>
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const data = await callTelegramAPI(token, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
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
