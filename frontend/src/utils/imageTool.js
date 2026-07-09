const maxDimension = 8000
const largeCanvasPixels = 16000000

export const imageFormats = [
  { key: 'png', label: 'PNG', mime: 'image/png', extension: 'png', supportsQuality: false, supportsTransparency: true },
  { key: 'jpeg', label: 'JPEG', mime: 'image/jpeg', extension: 'jpg', supportsQuality: true, supportsTransparency: false },
  { key: 'webp', label: 'WebP', mime: 'image/webp', extension: 'webp', supportsQuality: true, supportsTransparency: true },
]

function success(value) {
  return { ok: true, value }
}

function failure(error) {
  return { ok: false, error }
}

function toInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) ? number : NaN
}

function validateIntegerRange(value, min, max, label) {
  const number = toInteger(value)
  if (!Number.isInteger(number) || number < min || number > max) {
    return failure(`${label}必须是 ${min}..${max} 的整数`)
  }
  return success(number)
}

export function validateImageSize(width, height) {
  const widthResult = validateIntegerRange(width, 1, maxDimension, '宽度')
  if (!widthResult.ok) return widthResult

  const heightResult = validateIntegerRange(height, 1, maxDimension, '高度')
  if (!heightResult.ok) return heightResult

  const pixels = widthResult.value * heightResult.value
  return success({
    width: widthResult.value,
    height: heightResult.value,
    warning: pixels > largeCanvasPixels ? '画布像素较大，生成时可能会变慢' : '',
  })
}

export function getFormatConfig(format) {
  return imageFormats.find((item) => item.key === format) || null
}

export function normalizeQuality(format, quality) {
  const config = getFormatConfig(format)
  if (!config) return failure('图片格式无效，请选择 PNG、JPEG 或 WebP')
  if (!config.supportsQuality) return success(undefined)

  const number = Number(quality)
  if (!Number.isFinite(number) || number < 0.1 || number > 1) {
    return failure('压缩质量必须是 10%..100%')
  }
  return success(Number(number.toFixed(2)))
}

export function validateCrop(crop, canvasSize) {
  if (!crop?.enabled) return success(null)

  const xResult = validateIntegerRange(crop.x, 0, canvasSize.width - 1, '裁剪 X')
  if (!xResult.ok) return xResult

  const yResult = validateIntegerRange(crop.y, 0, canvasSize.height - 1, '裁剪 Y')
  if (!yResult.ok) return yResult

  const widthResult = validateIntegerRange(crop.width, 1, canvasSize.width, '裁剪宽度')
  if (!widthResult.ok) return widthResult

  const heightResult = validateIntegerRange(crop.height, 1, canvasSize.height, '裁剪高度')
  if (!heightResult.ok) return heightResult

  if (xResult.value + widthResult.value > canvasSize.width || yResult.value + heightResult.value > canvasSize.height) {
    return failure('裁剪区域不能超出画布范围')
  }

  return success({ x: xResult.value, y: yResult.value, width: widthResult.value, height: heightResult.value })
}

export function getOutputDimensions(canvasSize, crop) {
  return crop ? { width: crop.width, height: crop.height } : { width: canvasSize.width, height: canvasSize.height }
}

export function calculateBackgroundRect(mode, imageSize, canvasSize) {
  const source = { sx: 0, sy: 0, sWidth: imageSize.width, sHeight: imageSize.height }

  if (mode === 'contain') {
    const scale = Math.min(canvasSize.width / imageSize.width, canvasSize.height / imageSize.height)
    const dWidth = imageSize.width * scale
    const dHeight = imageSize.height * scale
    return { ...source, dx: (canvasSize.width - dWidth) / 2, dy: (canvasSize.height - dHeight) / 2, dWidth, dHeight }
  }

  if (mode === 'cover') {
    const scale = Math.max(canvasSize.width / imageSize.width, canvasSize.height / imageSize.height)
    const sWidth = canvasSize.width / scale
    const sHeight = canvasSize.height / scale
    return {
      sx: (imageSize.width - sWidth) / 2,
      sy: (imageSize.height - sHeight) / 2,
      sWidth,
      sHeight,
      dx: 0,
      dy: 0,
      dWidth: canvasSize.width,
      dHeight: canvasSize.height,
    }
  }

  return { ...source, dx: 0, dy: 0, dWidth: canvasSize.width, dHeight: canvasSize.height }
}

function getPositionCoordinate(position, total, size, margin) {
  if (position === 'start') return margin
  if (position === 'center') return (total - size) / 2
  return total - size - margin
}

export function calculateWatermarkRect(position, imageSize, canvasSize, scale, margin) {
  const width = canvasSize.width * Number(scale)
  const height = width * (imageSize.height / imageSize.width)
  const [vertical, horizontal] = position.split('-')
  const x = getPositionCoordinate(horizontal === 'left' ? 'start' : horizontal === 'right' ? 'end' : 'center', canvasSize.width, width, margin)
  const y = getPositionCoordinate(vertical === 'top' ? 'start' : vertical === 'bottom' ? 'end' : 'center', canvasSize.height, height, margin)
  return { x, y, width, height }
}

export function calculateTextBlock({ canvasWidth, canvasHeight, lines, fontSize, horizontal, vertical }) {
  const lineHeight = fontSize * 1.2
  const blockHeight = lines.length * lineHeight
  const x = horizontal === 'left' ? 0 : horizontal === 'right' ? canvasWidth : canvasWidth / 2
  const y = vertical === 'top' ? 0 : vertical === 'bottom' ? canvasHeight - blockHeight : (canvasHeight - blockHeight) / 2
  const align = horizontal === 'left' ? 'left' : horizontal === 'right' ? 'right' : 'center'
  return { x, y, align, baseline: 'top', lineHeight }
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Number(kb.toFixed(1)).toString()} KB`
  return `${Number((kb / 1024).toFixed(1)).toString()} MB`
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export function buildImageFileName(format, date = new Date()) {
  const config = getFormatConfig(format) || getFormatConfig('png')
  const stamp = [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    '-',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('')
  return `ahu-tools-image-${stamp}.${config.extension}`
}
