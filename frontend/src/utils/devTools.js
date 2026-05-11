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

export function encodeChineseUnicode(input) {
  return success(String(input).replace(/[一-鿿]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`))
}

export function decodeChineseUnicode(input) {
  return success(String(input).replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16))))
}

export function addJsonSlashes(input) {
  return success(String(input).replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
}

export function removeJsonSlashes(input) {
  return success(String(input).replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
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

function validateIntegerRange(value, min, max, label) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < min || number > max) {
    return failure(`${label} 必须是 ${min}..${max} 的整数`)
  }
  return success(number)
}

function getCrypto() {
  return globalThis.crypto
}

function getRandomBytes(length) {
  const crypto = getCrypto()
  if (!crypto?.getRandomValues) {
    throw new Error('当前环境不支持 Web Crypto 随机数')
  }
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

export function generateUuidV4() {
  const crypto = getCrypto()
  if (typeof crypto?.randomUUID === 'function') {
    return success(crypto.randomUUID())
  }

  try {
    const bytes = getRandomBytes(16)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return success(`${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`)
  } catch (error) {
    return failure(error.message)
  }
}

function generateFromAlphabet(length, alphabet) {
  const lengthResult = validateIntegerRange(length, 1, 512, '长度')
  if (!lengthResult.ok) return lengthResult

  try {
    const output = []
    const maxValid = Math.floor(256 / alphabet.length) * alphabet.length
    while (output.length < lengthResult.value) {
      for (const byte of getRandomBytes(lengthResult.value - output.length)) {
        if (byte >= maxValid) continue
        output.push(alphabet[byte % alphabet.length])
        if (output.length === lengthResult.value) break
      }
    }
    return success(output.join(''))
  } catch (error) {
    return failure(error.message)
  }
}

export function generateRandomHex(length) {
  return generateFromAlphabet(length, '0123456789abcdef')
}

export function generateRandomBase62(length) {
  return generateFromAlphabet(length, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
}

export function generateRandomStrings({ mode, length, count }) {
  const countResult = validateIntegerRange(count, 1, 100, '数量')
  if (!countResult.ok) return countResult

  const generator = mode === 'hex' ? generateRandomHex : mode === 'base62' ? generateRandomBase62 : mode === 'uuid' ? generateUuidV4 : null
  if (!generator) return failure('随机类型无效，请选择 uuid、hex 或 base62')

  const values = []
  for (let index = 0; index < countResult.value; index += 1) {
    const result = mode === 'uuid' ? generator() : generator(length)
    if (!result.ok) return result
    values.push(result.value)
  }
  return success(values)
}

function safeDecodeUrlComponent(value) {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, ' '))
  } catch {
    return String(value)
  }
}

export function parseUrlQuery(input) {
  const source = String(input || '').trim()
  const hashIndex = source.indexOf('#')
  const hash = hashIndex >= 0 ? source.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? source.slice(0, hashIndex) : source
  const queryIndex = withoutHash.indexOf('?')
  let baseUrl = ''
  let query = ''

  if (withoutHash.startsWith('?')) {
    query = withoutHash.slice(1)
  } else if (queryIndex >= 0) {
    baseUrl = withoutHash.slice(0, queryIndex)
    query = withoutHash.slice(queryIndex + 1)
  } else {
    try {
      const url = new URL(withoutHash)
      baseUrl = `${url.origin}${url.pathname}`
      query = url.search.replace(/^\?/, '')
    } catch {
      query = withoutHash
    }
  }

  if (!query) {
    return success({ baseUrl, hash, rows: [] })
  }

  const rows = query.split('&').map((pair) => {
    const separatorIndex = pair.indexOf('=')
    const rawKey = separatorIndex >= 0 ? pair.slice(0, separatorIndex) : pair
    const rawValue = separatorIndex >= 0 ? pair.slice(separatorIndex + 1) : ''
    return {
      key: safeDecodeUrlComponent(rawKey),
      value: safeDecodeUrlComponent(rawValue),
    }
  })

  return success({ baseUrl, hash, rows })
}

export function buildUrlQuery(rows, options = {}) {
  const sourceRows = Array.isArray(rows) ? rows : []
  const normalizedRows = sourceRows
    .map((row) => ({ key: String(row?.key ?? ''), value: String(row?.value ?? '') }))
    .filter((row) => row.key !== '')

  if (options.sort) {
    normalizedRows.sort((left, right) => left.key.localeCompare(right.key, 'zh-Hans'))
  }

  const query = normalizedRows
    .map((row) => `${encodeURIComponent(row.key)}=${encodeURIComponent(row.value)}`)
    .join('&')
  const baseUrl = String(options.baseUrl || '')
  const hash = String(options.hash || '')

  if (baseUrl) {
    return success(`${baseUrl}${query ? `?${query}` : ''}${hash}`)
  }
  return success(`${query}${hash}`)
}

export function testRegex({ pattern, flags, text }) {
  const allowedFlags = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y'])
  const seenFlags = new Set()
  const normalizedFlags = String(flags || '')

  for (const flag of normalizedFlags) {
    if (!allowedFlags.has(flag)) return failure(`无效正则 flag: ${flag}`)
    if (seenFlags.has(flag)) return failure(`重复正则 flag: ${flag}`)
    seenFlags.add(flag)
  }

  let regex
  try {
    regex = new RegExp(String(pattern || ''), normalizedFlags)
  } catch (error) {
    return failure(`正则表达式无效: ${error.message}`)
  }

  const input = String(text || '')
  const matches = []
  const collectMatch = (match) => ({
    match: match[0],
    index: match.index,
    groups: Array.from(match).slice(1),
    namedGroups: match.groups ? { ...match.groups } : {},
  })

  if (regex.global) {
    let match
    while ((match = regex.exec(input)) !== null) {
      matches.push(collectMatch(match))
      if (match[0] === '') regex.lastIndex += 1
    }
  } else {
    const match = regex.exec(input)
    if (match) matches.push(collectMatch(match))
  }

  return success({
    pattern: String(pattern || ''),
    flags: normalizedFlags,
    count: matches.length,
    matches,
  })
}

const htmlEntityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const namedHtmlEntities = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

export function encodeHtmlEntities(input) {
  return success(String(input).replace(/[&<>"']/g, (char) => htmlEntityMap[char]))
}

export function decodeHtmlEntities(input) {
  return success(String(input).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (entity, body) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const codePoint = Number.parseInt(body.slice(2), 16)
      return decodeNumericHtmlEntity(entity, codePoint)
    }
    if (body.startsWith('#')) {
      const codePoint = Number.parseInt(body.slice(1), 10)
      return decodeNumericHtmlEntity(entity, codePoint)
    }
    return Object.prototype.hasOwnProperty.call(namedHtmlEntities, body) ? namedHtmlEntities[body] : entity
  }))
}

function decodeNumericHtmlEntity(entity, codePoint) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    return entity
  }
  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return entity
  }
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

const jwtHmacAlgorithms = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

function normalizeJwtAlgorithm(algorithm) {
  return String(algorithm || '').trim().toUpperCase()
}

function getJwtHmacHash(algorithm) {
  return jwtHmacAlgorithms[normalizeJwtAlgorithm(algorithm)]
}

function encodeBase64UrlBytes(bytes) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return encodeBinary(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeBase64UrlText(text) {
  return encodeBase64UrlBytes(textEncoder.encode(text))
}

function encodeBase64UrlJson(value) {
  return encodeBase64UrlText(JSON.stringify(value))
}

function normalizeBase64Url(part) {
  const value = String(part || '')
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
    return failure('Base64URL 内容无效')
  }
  return success(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='))
}

function decodeBase64UrlText(part) {
  const normalized = normalizeBase64Url(part)
  if (!normalized.ok) return normalized
  return decodeBase64(normalized.value)
}

function decodeBase64UrlBytes(part) {
  const normalized = normalizeBase64Url(part)
  if (!normalized.ok) return normalized

  try {
    const binary = decodeBinary(normalized.value)
    return success(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  } catch {
    return failure('Base64URL 内容无效')
  }
}

function decodeJwtJsonOrText(part, label) {
  const decoded = decodeBase64UrlText(part)
  if (!decoded.ok) return decoded

  try {
    const value = JSON.parse(decoded.value)
    return success({ text: JSON.stringify(value, null, 2), value })
  } catch {
    return success({ text: decoded.value, value: null, error: `JWT ${label} 不是有效 JSON` })
  }
}

function parseJwtJson(input, label) {
  try {
    return success(JSON.parse(String(input || '')))
  } catch {
    return failure(`JWT ${label} 不是有效 JSON`)
  }
}

function splitJwtToken(input) {
  const parts = String(input).trim().split('.')
  if (parts.length !== 3 || parts.some((part) => !part)) {
    return failure('JWT 格式错误，应包含 header.payload.signature 三段内容')
  }
  return success(parts)
}

function timingSafeEqualBytes(left, right) {
  if (left.length !== right.length) return false

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }
  return diff === 0
}

async function digestBytes(hash, bytes) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    return failure('当前环境不支持 Web Crypto HMAC 签名')
  }

  try {
    return success(new Uint8Array(await subtle.digest(hash, bytes)))
  } catch {
    return failure('JWT 签名失败，请检查当前环境是否支持所选算法')
  }
}

async function signJwtInput(signingInput, secret, algorithm) {
  const hash = getJwtHmacHash(algorithm)
  if (!hash) {
    return failure('当前仅支持 HS256、HS384、HS512 HMAC JWT')
  }

  const blockSize = hash === 'SHA-256' ? 64 : 128
  let keyBytes = textEncoder.encode(secret)
  if (keyBytes.length > blockSize) {
    const digestedKey = await digestBytes(hash, keyBytes)
    if (!digestedKey.ok) return digestedKey
    keyBytes = digestedKey.value
  }

  const keyBlock = new Uint8Array(blockSize)
  keyBlock.set(keyBytes)
  const outerPad = new Uint8Array(blockSize)
  const innerPad = new Uint8Array(blockSize)
  for (let index = 0; index < blockSize; index += 1) {
    outerPad[index] = keyBlock[index] ^ 0x5c
    innerPad[index] = keyBlock[index] ^ 0x36
  }

  const messageBytes = textEncoder.encode(signingInput)
  const innerInput = new Uint8Array(innerPad.length + messageBytes.length)
  innerInput.set(innerPad)
  innerInput.set(messageBytes, innerPad.length)
  const innerDigest = await digestBytes(hash, innerInput)
  if (!innerDigest.ok) return innerDigest

  const outerInput = new Uint8Array(outerPad.length + innerDigest.value.length)
  outerInput.set(outerPad)
  outerInput.set(innerDigest.value, outerPad.length)
  return digestBytes(hash, outerInput)
}

export function decodeJwt(input) {
  const parts = splitJwtToken(input)
  if (!parts.ok) return parts

  const header = decodeJwtJsonOrText(parts.value[0], 'Header')
  if (!header.ok) return failure(header.error)

  const payload = decodeJwtJsonOrText(parts.value[1], 'Payload')
  if (!payload.ok) return failure(payload.error)

  const value = {
    header: header.value.text,
    payload: payload.value.text,
    signature: parts.value[2],
    algorithm: header.value.value?.alg || '',
  }
  if (header.value.error) value.headerError = header.value.error
  if (payload.value.error) value.payloadError = payload.value.error

  return success(value)
}

export async function signJwt({ header, payload, secret, algorithm }) {
  const normalizedSecret = String(secret ?? '')
  const normalizedAlgorithm = normalizeJwtAlgorithm(algorithm)
  if (!getJwtHmacHash(normalizedAlgorithm)) {
    return failure('当前仅支持 HS256、HS384、HS512 HMAC JWT')
  }

  const parsedHeader = parseJwtJson(header, 'Header')
  if (!parsedHeader.ok) return parsedHeader

  const parsedPayload = parseJwtJson(payload, 'Payload')
  if (!parsedPayload.ok) return parsedPayload

  const signedHeader = { ...parsedHeader.value, alg: normalizedAlgorithm }
  const encodedHeader = encodeBase64UrlJson(signedHeader)
  const encodedPayload = encodeBase64UrlJson(parsedPayload.value)
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = await signJwtInput(signingInput, normalizedSecret, normalizedAlgorithm)
  if (!signature.ok) return signature

  const encodedSignature = encodeBase64UrlBytes(signature.value)
  return success({
    token: `${signingInput}.${encodedSignature}`,
    header: JSON.stringify(signedHeader, null, 2),
    payload: JSON.stringify(parsedPayload.value, null, 2),
    signature: encodedSignature,
    algorithm: normalizedAlgorithm,
  })
}

export async function verifyJwt({ token, secret }) {
  const normalizedSecret = String(secret ?? '')
  const parts = splitJwtToken(token)
  if (!parts.ok) return parts

  const decoded = decodeJwt(token)
  if (!decoded.ok) return decoded
  if (decoded.value.headerError) return failure(decoded.value.headerError)

  const algorithm = normalizeJwtAlgorithm(decoded.value.algorithm)
  if (!getJwtHmacHash(algorithm)) {
    return failure('当前仅支持 HS256、HS384、HS512 HMAC JWT')
  }

  const actualSignature = decodeBase64UrlBytes(parts.value[2])
  if (!actualSignature.ok) return failure('JWT 签名内容无效')

  const signingInput = `${parts.value[0]}.${parts.value[1]}`
  const expectedSignature = await signJwtInput(signingInput, normalizedSecret, algorithm)
  if (!expectedSignature.ok) return expectedSignature

  return success({
    ...decoded.value,
    valid: timingSafeEqualBytes(actualSignature.value, expectedSignature.value),
  })
}
