import { describe, expect, it } from 'vitest'
import {
  buildImageFileName,
  calculateBackgroundRect,
  calculateTextBlock,
  calculateWatermarkRect,
  formatBytes,
  getFormatConfig,
  getOutputDimensions,
  normalizeQuality,
  validateCrop,
  validateImageSize,
} from './imageTool'

describe('imageTool utilities', () => {
  it('validates image dimensions', () => {
    expect(validateImageSize(800, 450)).toEqual({ ok: true, value: { width: 800, height: 450, warning: '' } })
    expect(validateImageSize(0, 450)).toEqual({ ok: false, error: '宽度必须是 1..8000 的整数' })
    expect(validateImageSize(800, 9000)).toEqual({ ok: false, error: '高度必须是 1..8000 的整数' })
    expect(validateImageSize(5000, 4000)).toEqual({
      ok: true,
      value: { width: 5000, height: 4000, warning: '画布像素较大，生成时可能会变慢' },
    })
  })

  it('returns format config and compression support', () => {
    expect(getFormatConfig('png')).toEqual({
      key: 'png',
      label: 'PNG',
      mime: 'image/png',
      extension: 'png',
      supportsQuality: false,
      supportsTransparency: true,
    })
    expect(getFormatConfig('jpeg')).toEqual({
      key: 'jpeg',
      label: 'JPEG',
      mime: 'image/jpeg',
      extension: 'jpg',
      supportsQuality: true,
      supportsTransparency: false,
    })
    expect(getFormatConfig('webp')).toEqual({
      key: 'webp',
      label: 'WebP',
      mime: 'image/webp',
      extension: 'webp',
      supportsQuality: true,
      supportsTransparency: true,
    })
    expect(getFormatConfig('gif')).toBeNull()
  })

  it('normalizes JPEG and WebP quality while ignoring PNG quality', () => {
    expect(normalizeQuality('png', 0.2)).toEqual({ ok: true, value: undefined })
    expect(normalizeQuality('jpeg', 0.75)).toEqual({ ok: true, value: 0.75 })
    expect(normalizeQuality('webp', 1.5)).toEqual({ ok: false, error: '压缩质量必须是 10%..100%' })
  })

  it('validates crop area and output dimensions', () => {
    const base = { width: 800, height: 450 }
    expect(validateCrop({ enabled: false, x: 0, y: 0, width: 0, height: 0 }, base)).toEqual({ ok: true, value: null })
    expect(validateCrop({ enabled: true, x: 100, y: 50, width: 300, height: 200 }, base)).toEqual({
      ok: true,
      value: { x: 100, y: 50, width: 300, height: 200 },
    })
    expect(validateCrop({ enabled: true, x: 700, y: 50, width: 200, height: 200 }, base)).toEqual({
      ok: false,
      error: '裁剪区域不能超出画布范围',
    })
    expect(getOutputDimensions(base, { x: 100, y: 50, width: 300, height: 200 })).toEqual({ width: 300, height: 200 })
  })

  it('calculates background rectangles for each fit mode', () => {
    const image = { width: 400, height: 200 }
    const canvas = { width: 800, height: 600 }
    expect(calculateBackgroundRect('stretch', image, canvas)).toEqual({
      sx: 0,
      sy: 0,
      sWidth: 400,
      sHeight: 200,
      dx: 0,
      dy: 0,
      dWidth: 800,
      dHeight: 600,
    })
    expect(calculateBackgroundRect('contain', image, canvas)).toEqual({
      sx: 0,
      sy: 0,
      sWidth: 400,
      sHeight: 200,
      dx: 0,
      dy: 100,
      dWidth: 800,
      dHeight: 400,
    })
    expect(calculateBackgroundRect('cover', image, canvas)).toEqual({
      sx: 66.66666666666666,
      sy: 0,
      sWidth: 266.6666666666667,
      sHeight: 200,
      dx: 0,
      dy: 0,
      dWidth: 800,
      dHeight: 600,
    })
  })

  it('calculates watermark rectangles from position, scale, and margin', () => {
    expect(calculateWatermarkRect(
      'bottom-right',
      { width: 200, height: 100 },
      { width: 1000, height: 600 },
      0.2,
      24,
    )).toEqual({ x: 776, y: 476, width: 200, height: 100 })
  })

  it('calculates text block anchors and formats bytes', () => {
    expect(calculateTextBlock({
      canvasWidth: 800,
      canvasHeight: 450,
      lines: ['AhuTools', '图片生成'],
      fontSize: 32,
      horizontal: 'center',
      vertical: 'middle',
    })).toEqual({ x: 400, y: 186.6, align: 'center', baseline: 'top', lineHeight: 38.4 })
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('builds stable output filenames', () => {
    const date = new Date('2026-07-09T08:06:05.000Z')
    expect(buildImageFileName('jpeg', date)).toBe('ahu-tools-image-20260709-080605.jpg')
  })
})
