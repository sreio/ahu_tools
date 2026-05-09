import { describe, expect, it } from 'vitest'
import {
  addJsonSlashes,
  dateToTimestamp,
  decodeBase64,
  decodeChineseUnicode,
  decodeJwt,
  decodeUrl,
  encodeBase64,
  encodeChineseUnicode,
  encodeUrl,
  formatJson,
  hashText,
  minifyJson,
  removeJsonSlashes,
  timestampToDate,
} from './devTools'

describe('devTools utilities', () => {
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
  })

  it('rejects malformed JWT input', () => {
    expect(decodeJwt('not-a-token')).toEqual({
      ok: false,
      error: 'JWT 格式错误，应包含 header.payload.signature 三段内容',
    })
  })
})
