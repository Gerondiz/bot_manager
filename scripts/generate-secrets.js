#!/usr/bin/env node
/**
 * Генерация случайных секретов для .env.local
 * Использование: node scripts/generate-secrets.js
 */

const crypto = require('crypto')

const randomHex = (bytes) => crypto.randomBytes(bytes).toString('hex')
const randomBase64 = (bytes) => crypto.randomBytes(bytes).toString('base64')

console.log('# Сгенерированные секреты для .env.local')
console.log('# Скопируйте в .env.local и замените существующие значения')
console.log('')
console.log(`ENCRYPTION_KEY="${randomHex(32)}"`)
console.log(`JWT_SECRET="${randomHex(32)}"`)
console.log(`ADMIN_PASSWORD="${randomBase64(12).replace(/[+/=]/g, '').slice(0, 16)}"`)
console.log(`AAF_WEBHOOK_SECRET="${randomHex(32)}"`)
console.log('')
console.log('# Скопируйте AAF_WEBHOOK_SECRET в qwen_aaf .env как WEBHOOK_SECRET')
