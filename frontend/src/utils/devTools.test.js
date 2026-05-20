import { describe, expect, it } from 'vitest'
import {
  addJsonSlashes,
  dateToTimestamp,
  buildUrlQuery,
  decodeBase64,
  decodeChineseUnicode,
  decodeHtmlEntities,
  decodeJwt,
  decodeUrl,
  signJwt,
  encodeBase64,
  encodeChineseUnicode,
  encodeHtmlEntities,
  encodeUrl,
  formatJson,
  generateRandomBase62,
  generateRandomHex,
  generateRandomStrings,
  generateUuidV4,
  getUtf8ByteLength,
  hashText,
  minifyJson,
  parseUrlQuery,
  removeJsonSlashes,
  testRegex,
  timestampToDate,
  verifyJwt,
} from './devTools'

describe('devTools utilities', () => {
  it('counts UTF-8 bytes instead of UTF-16 code units', () => {
    expect(getUtf8ByteLength('1234567890123456')).toBe(16)
    expect(getUtf8ByteLength('中文')).toBe(6)
  })

  it('formats valid JSON', () => {
    expect(formatJson('{"name":"AhuTools","ok":true}')).toEqual({
      ok: true,
      value: '{\n  "name": "AhuTools",\n  "ok": true\n}',
    })
  })

  it('minifies valid JSON', () => {
    expect(minifyJson('{\n  "name": "AhuTools",\n  "ok": true\n}')).toEqual({
      ok: true,
      value: '{"name":"AhuTools","ok":true}',
    })
  })

  it('returns invalid JSON errors', () => {
    expect(formatJson('{bad json')).toEqual({
      ok: false,
      error: 'JSON 格式错误，请检查输入内容',
    })
  })

  it('encodes Chinese characters as Unicode escapes', () => {
    expect(encodeChineseUnicode('中文 AhuTools')).toEqual({
      ok: true,
      value: '\\u4e2d\\u6587 AhuTools',
    })
  })

  it('decodes Unicode escapes to Chinese characters', () => {
    expect(decodeChineseUnicode('\\u4e2d\\u6587 AhuTools')).toEqual({
      ok: true,
      value: '中文 AhuTools',
    })
  })

  it('adds and removes JSON slashes', () => {
    const escaped = addJsonSlashes('{"name":"中文"}')
    expect(escaped).toEqual({
      ok: true,
      value: '{\\"name\\":\\"中文\\"}',
    })
    expect(removeJsonSlashes(escaped.value)).toEqual({ ok: true, value: '{"name":"中文"}' })
  })

  it('encodes and decodes UTF-8 Base64 text', () => {
    const encoded = encodeBase64('你好 AhuTools')
    expect(encoded).toEqual({ ok: true, value: '5L2g5aW9IEFodVRvb2xz' })
    expect(decodeBase64(encoded.value)).toEqual({ ok: true, value: '你好 AhuTools' })
  })

  it('returns invalid Base64 errors', () => {
    expect(decodeBase64('%%%')).toEqual({
      ok: false,
      error: 'Base64 内容无效，请检查输入内容',
    })
  })

  it('encodes and decodes URLs', () => {
    const encoded = encodeUrl('https://example.com?q=你好&name=AhuTools')
    expect(encoded).toEqual({
      ok: true,
      value: 'https%3A%2F%2Fexample.com%3Fq%3D%E4%BD%A0%E5%A5%BD%26name%3DAhuTools',
    })
    expect(decodeUrl(encoded.value)).toEqual({
      ok: true,
      value: 'https://example.com?q=你好&name=AhuTools',
    })
  })

  it('returns malformed URI errors', () => {
    expect(decodeUrl('%E0%A4%A')).toEqual({
      ok: false,
      error: 'URL 编码内容无效，请检查是否存在 malformed URI',
    })
  })

  it('converts second timestamp to local datetime', () => {
    const result = timestampToDate('1704067200')
    expect(result.ok).toBe(true)
    expect(result.value.timestampMs).toBe(1704067200000)
    expect(result.value.iso).toBe('2024-01-01T00:00:00.000Z')
  })

  it('converts millisecond timestamp to local datetime', () => {
    const result = timestampToDate('1704067200000')
    expect(result.ok).toBe(true)
    expect(result.value.timestampMs).toBe(1704067200000)
    expect(result.value.iso).toBe('2024-01-01T00:00:00.000Z')
  })

  it('rejects invalid timestamp input', () => {
    expect(timestampToDate('abc')).toEqual({
      ok: false,
      error: '时间戳无效，请输入秒或毫秒 timestamp',
    })
  })

  it('converts datetime to second and millisecond timestamps', () => {
    expect(dateToTimestamp('2024-01-01T00:00:00.000Z')).toEqual({
      ok: true,
      value: {
        seconds: 1704067200,
        milliseconds: 1704067200000,
        iso: '2024-01-01T00:00:00.000Z',
        local: expect.any(String),
      },
    })
  })

  it('generates UUID and random strings using Web Crypto', () => {
    const uuid = generateUuidV4()
    expect(uuid.ok).toBe(true)
    expect(uuid.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)

    const hex = generateRandomHex(16)
    expect(hex.ok).toBe(true)
    expect(hex.value).toMatch(/^[0-9a-f]{16}$/)

    const base62 = generateRandomBase62(16)
    expect(base62.ok).toBe(true)
    expect(base62.value).toMatch(/^[0-9A-Za-z]{16}$/)

    const values = generateRandomStrings({ mode: 'hex', length: 8, count: 3 })
    expect(values.ok).toBe(true)
    expect(values.value).toHaveLength(3)
    expect(values.value.every((item) => /^[0-9a-f]{8}$/.test(item))).toBe(true)
  })

  it('rejects random string limits outside allowed ranges', () => {
    expect(generateRandomHex(0)).toEqual({ ok: false, error: '长度 必须是 1..512 的整数' })
    expect(generateRandomStrings({ mode: 'base62', length: 8, count: 101 })).toEqual({
      ok: false,
      error: '数量 必须是 1..100 的整数',
    })
  })

  it('parses full URL query strings preserving duplicates and hash', () => {
    expect(parseUrlQuery('https://example.com/path?a=1&a=中文&empty=&encoded=%E4%BD%A0#top')).toEqual({
      ok: true,
      value: {
        baseUrl: 'https://example.com/path',
        hash: '#top',
        rows: [
          { key: 'a', value: '1' },
          { key: 'a', value: '中文' },
          { key: 'empty', value: '' },
          { key: 'encoded', value: '你' },
        ],
      },
    })
  })

  it('parses full URLs without query as empty parameter lists', () => {
    expect(parseUrlQuery('https://example.com/path#top')).toEqual({
      ok: true,
      value: {
        baseUrl: 'https://example.com/path',
        hash: '#top',
        rows: [],
      },
    })
  })

  it('builds query strings and can sort by key', () => {
    const rows = [
      { key: 'b', value: '2' },
      { key: 'a', value: '中文' },
      { key: 'a', value: '1' },
    ]
    expect(buildUrlQuery(rows, { baseUrl: 'https://example.com', hash: '#top', sort: true })).toEqual({
      ok: true,
      value: 'https://example.com?a=%E4%B8%AD%E6%96%87&a=1&b=2#top',
    })
  })

  it('tests regular expressions and avoids zero-width global loops', () => {
    expect(testRegex({ pattern: '(?<word>\\w+)', flags: 'g', text: 'one two' })).toEqual({
      ok: true,
      value: {
        pattern: '(?<word>\\w+)',
        flags: 'g',
        count: 2,
        matches: [
          { match: 'one', index: 0, groups: ['one'], namedGroups: { word: 'one' } },
          { match: 'two', index: 4, groups: ['two'], namedGroups: { word: 'two' } },
        ],
      },
    })

    const zeroWidth = testRegex({ pattern: '^|$', flags: 'g', text: 'abc' })
    expect(zeroWidth.ok).toBe(true)
    expect(zeroWidth.value.count).toBe(2)
  })

  it('rejects duplicate and invalid regular expression flags', () => {
    expect(testRegex({ pattern: '.', flags: 'gg', text: 'a' })).toEqual({ ok: false, error: '重复正则 flag: g' })
    expect(testRegex({ pattern: '.', flags: 'z', text: 'a' })).toEqual({ ok: false, error: '无效正则 flag: z' })
  })

  it('encodes and decodes HTML entities', () => {
    const encoded = encodeHtmlEntities('&<>"\'')
    expect(encoded).toEqual({ ok: true, value: '&amp;&lt;&gt;&quot;&#39;' })
    expect(decodeHtmlEntities(`${encoded.value} &#x4F60; &#20320; &#xD800; &unknown;`)).toEqual({
      ok: true,
      value: '&<>"\' 你 你 &#xD800; &unknown;',
    })
  })

  it('computes stable SHA hashes', async () => {
    await expect(hashText('AhuTools', 'SHA-256')).resolves.toEqual({
      ok: true,
      value: '4755c387e3c4239e99f5f419cd96a91dea89dc26d764b810ad206f0a9c3f513c',
    })
  })

  it('decodes JWT header and payload without verification', () => {
    const token = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWh1VG9vbHMiLCJpYXQiOjE3MDQwNjcyMDB9',
      'signature',
    ].join('.')

    expect(decodeJwt(token)).toEqual({
      ok: true,
      value: {
        header: '{\n  "alg": "HS256",\n  "typ": "JWT"\n}',
        payload: '{\n  "sub": "123",\n  "name": "AhuTools",\n  "iat": 1704067200\n}',
        signature: 'signature',
        algorithm: 'HS256',
      },
    })
  })

  it('decodes JWT Base64URL payload without padding', () => {
    const token = [
      'eyJhbGciOiJub25lIn0',
      'eyJzY29wZSI6IuW3peWFtyJ9',
      'signature',
    ].join('.')

    const result = decodeJwt(token)
    expect(result.ok).toBe(true)
    expect(result.value.payload).toBe('{\n  "scope": "工具"\n}')
    expect(result.value.signature).toBe('signature')
    expect(result.value.algorithm).toBe('none')
  })

  it('decodes JWT raw text when payload JSON is malformed', () => {
    const result = decodeJwt('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhaHV4dWVzaHUuY29tIiwiZXhwIjoxNzgwOTI5NTAwLCJzdWIiOiI0ODI1Njc4LCJpYXQiOjE3NzgzMzc1MDB9.vNaBZzQdncE7qTTC-YcHGGXPvw63AvPjgx2u9wAuMWQ')

    expect(result).toEqual({
      ok: true,
      value: {
        header: '{\n  "typ": "JWT",\n  "alg": "HS256"\n}',
        payload: '{"iss":"ahuxueshu.com","exp":1780929500,"sub":"4825678,"iat":1778337500}',
        signature: 'vNaBZzQdncE7qTTC-YcHGGXPvw63AvPjgx2u9wAuMWQ',
        algorithm: 'HS256',
        payloadError: 'JWT Payload 不是有效 JSON',
      },
    })
  })

  it('signs JWTs using HS256', async () => {
    const result = await signJwt({
      header: '{"alg":"HS256","typ":"JWT"}',
      payload: '{"sub":"1234567890","name":"John Doe","iat":1516239022}',
      secret: 'your-256-bit-secret',
      algorithm: 'HS256',
    })

    expect(result).toEqual({
      ok: true,
      value: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        header: '{\n  "alg": "HS256",\n  "typ": "JWT"\n}',
        payload: '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}',
        signature: 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        algorithm: 'HS256',
      },
    })
  })

  it('verifies JWT signatures and detects tampering', async () => {
    const signed = await signJwt({
      header: '{"typ":"JWT"}',
      payload: '{"sub":"123","name":"AhuTools"}',
      secret: 'secret',
      algorithm: 'HS256',
    })

    const verified = await verifyJwt({ token: signed.value.token, secret: 'secret' })
    expect(verified.ok).toBe(true)
    expect(verified.value.valid).toBe(true)
    expect(verified.value.algorithm).toBe('HS256')

    const parts = signed.value.token.split('.')
    const tampered = [parts[0], 'eyJzdWIiOiI0NTYifQ', parts[2]].join('.')
    const tamperedResult = await verifyJwt({ token: tampered, secret: 'secret' })
    expect(tamperedResult.ok).toBe(true)
    expect(tamperedResult.value.valid).toBe(false)
  })

  it('signs and verifies HS384 and HS512 JWTs', async () => {
    for (const algorithm of ['HS384', 'HS512']) {
      const signed = await signJwt({
        header: '{"typ":"JWT"}',
        payload: '{"scope":"工具"}',
        secret: 'secret',
        algorithm,
      })

      expect(signed.ok).toBe(true)
      expect(signed.value.algorithm).toBe(algorithm)

      const verified = await verifyJwt({ token: signed.value.token, secret: 'secret' })
      expect(verified.ok).toBe(true)
      expect(verified.value.valid).toBe(true)
      expect(verified.value.algorithm).toBe(algorithm)
    }
  })

  it('signs and verifies JWTs with empty secrets', async () => {
    const signed = await signJwt({
      header: '{"typ":"JWT"}',
      payload: '{"sub":"123"}',
      secret: '',
      algorithm: 'HS256',
    })

    expect(signed.ok).toBe(true)

    const verified = await verifyJwt({ token: signed.value.token, secret: '' })
    expect(verified.ok).toBe(true)
    expect(verified.value.valid).toBe(true)
  })

  it('rejects JWT signing and verification errors', async () => {
    await expect(signJwt({ header: '{bad', payload: '{}', secret: 'secret', algorithm: 'HS256' })).resolves.toEqual({
      ok: false,
      error: 'JWT Header 不是有效 JSON',
    })
    await expect(signJwt({ header: '{}', payload: '{bad', secret: 'secret', algorithm: 'HS256' })).resolves.toEqual({
      ok: false,
      error: 'JWT Payload 不是有效 JSON',
    })

    const unsupported = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signature'
    await expect(verifyJwt({ token: unsupported, secret: 'secret' })).resolves.toEqual({
      ok: false,
      error: '当前仅支持 HS256、HS384、HS512 HMAC JWT',
    })
  })

  it('rejects malformed JWT input', () => {
    expect(decodeJwt('not-a-token')).toEqual({
      ok: false,
      error: 'JWT 格式错误，应包含 header.payload.signature 三段内容',
    })
  })
})
