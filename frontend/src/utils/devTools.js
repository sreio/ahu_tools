const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8', { fatal: true })

function success(value) {
  return { ok: true, value }
}

function failure(error) {
  return { ok: false, error }
}

function encodeBinary(binary) {
  if (typeof btoa === 'function') {
    return btoa(binary)
  }
  return Buffer.from(binary, 'binary').toString('base64')
}

function decodeBinary(input) {
  if (typeof atob === 'function') {
    return atob(input)
  }
  return Buffer.from(input, 'base64').toString('binary')
}

function parseJson(input) {
  try {
    return success(JSON.parse(input))
  } catch {
    return failure('JSON 格式错误，请检查输入内容')
  }
}

export function formatJson(input) {
  const parsed = parseJson(input)
  if (!parsed.ok) return parsed
  return success(JSON.stringify(parsed.value, null, 2))
}

export function minifyJson(input) {
  const parsed = parseJson(input)
  if (!parsed.ok) return parsed
  return success(JSON.stringify(parsed.value))
}

export function encodeBase64(input) {
  const bytes = textEncoder.encode(input)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return success(encodeBinary(binary))
}

export function decodeBase64(input) {
  const normalized = String(input).trim()

  try {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
      return failure('Base64 内容无效，请检查输入内容')
    }

    const binary = decodeBinary(normalized)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return success(textDecoder.decode(bytes))
  } catch {
    return failure('Base64 内容无效，请检查输入内容')
  }
}

export function encodeUrl(input) {
  try {
    return success(encodeURIComponent(input))
  } catch {
    return failure('URL 编码失败，请检查输入内容')
  }
}

export function decodeUrl(input) {
  try {
    return success(decodeURIComponent(input))
  } catch {
    return failure('URL 编码内容无效，请检查是否存在 malformed URI')
  }
}

export function timestampToDate(input) {
  const normalized = String(input).trim()
  if (!/^\d{10}$|^\d{13}$/.test(normalized)) {
    return failure('时间戳无效，请输入秒或毫秒 timestamp')
  }

  const timestamp = Number(normalized)
  const timestampMs = normalized.length === 10 ? timestamp * 1000 : timestamp
  const date = new Date(timestampMs)

  if (Number.isNaN(date.getTime())) {
    return failure('时间戳无效，请输入秒或毫秒 timestamp')
  }

  return success({
    timestampMs,
    iso: date.toISOString(),
    local: date.toLocaleString(),
  })
}

export function dateToTimestamp(input) {
  const date = new Date(input)
  if (!input || Number.isNaN(date.getTime())) {
    return failure('日期时间无效，请输入可解析的日期时间')
  }

  const milliseconds = date.getTime()
  return success({
    seconds: Math.floor(milliseconds / 1000),
    milliseconds,
    iso: date.toISOString(),
    local: date.toLocaleString(),
  })
}

export async function hashText(input, algorithm) {
  try {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
      return failure('Hash 计算失败，当前环境不支持 Web Crypto')
    }

    const digest = await subtle.digest(algorithm, textEncoder.encode(input))
    const bytes = Array.from(new Uint8Array(digest))
    return success(bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(''))
  } catch {
    return failure('Hash 计算失败，请检查算法是否受当前环境支持')
  }
}

function decodeBase64UrlJson(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const decoded = decodeBase64(padded)
  if (!decoded.ok) return decoded

  try {
    return success(JSON.parse(decoded.value))
  } catch {
    return failure('JWT 内容不是有效 JSON')
  }
}

export function decodeJwt(input) {
  const parts = String(input).trim().split('.')
  if (parts.length !== 3 || parts.some((part) => !part)) {
    return failure('JWT 格式错误，应包含 header.payload.signature 三段内容')
  }

  const header = decodeBase64UrlJson(parts[0])
  if (!header.ok) return failure(header.error)

  const payload = decodeBase64UrlJson(parts[1])
  if (!payload.ok) return failure(payload.error)

  return success({
    header: JSON.stringify(header.value, null, 2),
    payload: JSON.stringify(payload.value, null, 2),
  })
}
