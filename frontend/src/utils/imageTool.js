const maxDimension = 8000
const largeCanvasPixels = 16000000

export const imageFormats = [
  { key: 'png', label: 'PNG', mime: 'image/png', extension: 'png', supportsQuality: false, supportsTransparency: true },
  { key: 'jpeg', label: 'JPEG', mime: 'image/jpeg', extension: 'jpg', supportsQuality: true, supportsTransparency: false },
  { key: 'webp', label: 'WebP', mime: 'image/webp', extension: 'webp', supportsQuality: true, supportsTransparency: true },
]

const themeDefinitions = [
  {
    key: 'aurora',
    label: '极光渐变',
    family: 'aurora',
    palettes: [
      ['#0f172a', '#2563eb', '#22d3ee', '#a78bfa'],
      ['#111827', '#7c3aed', '#06b6d4', '#f0f9ff'],
      ['#ecfeff', '#38bdf8', '#8b5cf6', '#fdf4ff'],
    ],
  },
  {
    key: 'glass',
    label: '玻璃拟态',
    family: 'glass',
    palettes: [
      ['#f8fafc', '#dbeafe', '#c4b5fd', '#ffffff'],
      ['#eff6ff', '#bae6fd', '#ddd6fe', '#f8fafc'],
      ['#0f172a', '#1e40af', '#67e8f9', '#f8fafc'],
    ],
  },
  {
    key: 'paper',
    label: '高级纸感',
    family: 'paper',
    palettes: [
      ['#f8f5ef', '#e7dccb', '#a3b18a', '#334155'],
      ['#faf7f0', '#e2e8f0', '#d6ccc2', '#475569'],
      ['#f9fafb', '#e5e7eb', '#cbd5e1', '#111827'],
    ],
  },
  {
    key: 'tech-grid',
    label: '科技网格',
    family: 'grid',
    palettes: [
      ['#020617', '#0f172a', '#38bdf8', '#22c55e'],
      ['#030712', '#1e1b4b', '#60a5fa', '#a78bfa'],
      ['#08111f', '#0e7490', '#67e8f9', '#f8fafc'],
    ],
  },
  {
    key: 'fresh-geometry',
    label: '清爽几何',
    family: 'geometry',
    palettes: [
      ['#f8fafc', '#bfdbfe', '#99f6e4', '#fef3c7'],
      ['#ecfeff', '#bae6fd', '#bbf7d0', '#ffffff'],
      ['#fff7ed', '#fed7aa', '#bfdbfe', '#f8fafc'],
    ],
  },
  {
    key: 'neon',
    label: '霓虹流光',
    family: 'neon',
    palettes: [
      ['#020617', '#111827', '#f472b6', '#22d3ee'],
      ['#0f1020', '#312e81', '#a3e635', '#38bdf8'],
      ['#050816', '#581c87', '#fb7185', '#60a5fa'],
    ],
  },
  {
    key: 'magazine',
    label: '杂志封面',
    family: 'magazine',
    palettes: [
      ['#f8fafc', '#111827', '#e11d48', '#facc15'],
      ['#fff7ed', '#1f2937', '#2563eb', '#fb923c'],
      ['#f5f5f4', '#0f172a', '#16a34a', '#eab308'],
    ],
  },
  {
    key: 'natural-light',
    label: '自然柔光',
    family: 'natural',
    palettes: [
      ['#f0fdf4', '#bbf7d0', '#7dd3fc', '#ffffff'],
      ['#fefce8', '#fde68a', '#bae6fd', '#f8fafc'],
      ['#ecfdf5', '#a7f3d0', '#bfdbfe', '#14532d'],
    ],
  },
]

export const imageThemes = [
  { key: 'random', label: '随机' },
  ...themeDefinitions.map(({ key, label }) => ({ key, label })),
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

function createSeededRandom(seed) {
  let state = Number(seed) >>> 0
  if (!state) state = 1

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function pickFrom(values, random) {
  return values[Math.floor(random() * values.length)]
}

function hexToRgb(hex) {
  const normalized = String(hex).replace('#', '')
  const value = parseInt(normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function createThemeShapes(family, random) {
  const countByFamily = {
    aurora: 9,
    glass: 11,
    paper: 34,
    grid: 30,
    geometry: 16,
    neon: 18,
    magazine: 10,
    natural: 12,
  }
  const count = countByFamily[family] || 12

  return Array.from({ length: count }, (_, index) => ({
    id: index,
    x: Number(random().toFixed(4)),
    y: Number(random().toFixed(4)),
    size: Number((0.08 + random() * 0.32).toFixed(4)),
    rotation: Number((random() * Math.PI * 2).toFixed(4)),
    opacity: Number((0.06 + random() * 0.28).toFixed(4)),
    variant: Math.floor(random() * 4),
  }))
}

export function createThemeSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1)
    globalThis.crypto.getRandomValues(values)
    return values[0] || 1
  }
  return Math.floor(Math.random() * 4294967295) || 1
}

export function getThemeDefinition(themeKey) {
  return themeDefinitions.find((item) => item.key === themeKey) || null
}

export function pickReadableTextColor(palette) {
  const luminance = palette.reduce((sum, color) => sum + getRelativeLuminance(color), 0) / Math.max(palette.length, 1)
  return luminance < 0.45 ? '#f8fafc' : '#111827'
}

export function buildThemeConfig(themeKey, seed = createThemeSeed()) {
  const baseRandom = createSeededRandom(seed)
  const candidates = themeDefinitions
  const definition = themeKey === 'random' ? pickFrom(candidates, baseRandom) : getThemeDefinition(themeKey) || getThemeDefinition('aurora')
  const random = createSeededRandom(`${definition.key}:${seed}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), Number(seed) || 1))
  const palette = pickFrom(definition.palettes, random)

  return {
    key: definition.key,
    label: definition.label,
    family: definition.family,
    seed: Number(seed) || 1,
    palette,
    textColor: pickReadableTextColor(palette),
    gradientAngle: Number((random() * 360).toFixed(2)),
    shapes: createThemeShapes(definition.family, random),
  }
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
