# Image Generator Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Canvas-based image generator tool that supports custom dimensions, PNG/JPEG/WebP export, centered text, background image, watermark image, crop settings, compression quality, preview, and local download.

**Architecture:** Keep image math and validation in `frontend/src/utils/imageTool.js` so it is covered by Vitest. Keep browser-only Canvas, FileReader, Image decoding, preview URL, and download behavior inside `frontend/src/tools/ImageGeneratorTool.vue`. Register the tool through the existing `frontend/src/tools/index.js` registry and style it with scoped utility classes in `frontend/src/style.css`.

**Tech Stack:** Vue 3 options API, Element Plus, browser Canvas API, Blob download, Vitest.

---

## File Structure

- Create `frontend/src/utils/imageTool.js`: pure helpers for dimensions, formats, quality, crop validation, filename creation, background rectangles, watermark rectangles, text block positions, and byte formatting.
- Create `frontend/src/utils/imageTool.test.js`: unit tests for all pure helpers.
- Create `frontend/src/tools/ImageGeneratorTool.vue`: the image generator UI and browser drawing/download workflow.
- Modify `frontend/src/tools/index.js`: import and register the new tool.
- Modify `frontend/src/style.css`: add preview, upload summary, metadata, and compact image form styles.

## Task 1: Image Tool Utility Tests

**Files:**
- Create: `frontend/src/utils/imageTool.test.js`
- Test: `frontend/src/utils/imageTool.test.js`

- [ ] **Step 1: Write failing utility tests**

Create `frontend/src/utils/imageTool.test.js` with:

```js
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
    expect(getFormatConfig('png')).toEqual({ key: 'png', label: 'PNG', mime: 'image/png', extension: 'png', supportsQuality: false, supportsTransparency: true })
    expect(getFormatConfig('jpeg')).toEqual({ key: 'jpeg', label: 'JPEG', mime: 'image/jpeg', extension: 'jpg', supportsQuality: true, supportsTransparency: false })
    expect(getFormatConfig('webp')).toEqual({ key: 'webp', label: 'WebP', mime: 'image/webp', extension: 'webp', supportsQuality: true, supportsTransparency: true })
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
    expect(calculateBackgroundRect('stretch', image, canvas)).toEqual({ sx: 0, sy: 0, sWidth: 400, sHeight: 200, dx: 0, dy: 0, dWidth: 800, dHeight: 600 })
    expect(calculateBackgroundRect('contain', image, canvas)).toEqual({ sx: 0, sy: 0, sWidth: 400, sHeight: 200, dx: 0, dy: 100, dWidth: 800, dHeight: 400 })
    expect(calculateBackgroundRect('cover', image, canvas)).toEqual({ sx: 66.66666666666666, sy: 0, sWidth: 266.6666666666667, sHeight: 200, dx: 0, dy: 0, dWidth: 800, dHeight: 600 })
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
    })).toEqual({ x: 400, y: 186.4, align: 'center', baseline: 'top', lineHeight: 38.4 })
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('builds stable output filenames', () => {
    const date = new Date('2026-07-09T08:06:05.000Z')
    expect(buildImageFileName('jpeg', date)).toBe('ahu-tools-image-20260709-080605.jpg')
  })
})
```

- [ ] **Step 2: Run the utility test to verify it fails**

Run:

```bash
npm run test --prefix frontend -- imageTool.test.js
```

Expected: fail because `frontend/src/utils/imageTool.js` does not exist.

## Task 2: Image Tool Utility Implementation

**Files:**
- Create: `frontend/src/utils/imageTool.js`
- Test: `frontend/src/utils/imageTool.test.js`

- [ ] **Step 1: Implement utility helpers**

Create `frontend/src/utils/imageTool.js` with:

```js
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
```

- [ ] **Step 2: Run utility tests**

Run:

```bash
npm run test --prefix frontend -- imageTool.test.js
```

Expected: pass.

## Task 3: Tool Registration

**Files:**
- Modify: `frontend/src/tools/index.js`

- [ ] **Step 1: Register the new tool**

Modify `frontend/src/tools/index.js` by adding the import near the other tool imports:

```js
import ImageGeneratorTool from './ImageGeneratorTool.vue'
```

Add this tool object after the `random` tool entry:

```js
  {
    key: 'image-generator',
    name: '图片生成',
    group: '图片工具',
    description: '尺寸、文字、背景、水印',
    shortName: '图',
    component: ImageGeneratorTool,
  },
```

- [ ] **Step 2: Run frontend build to verify registry import resolution**

Run:

```bash
npm run build --prefix frontend
```

Expected: fail until `frontend/src/tools/ImageGeneratorTool.vue` is created in Task 4.

## Task 4: Image Generator Vue Tool

**Files:**
- Create: `frontend/src/tools/ImageGeneratorTool.vue`
- Modify: `frontend/src/tools/index.js`

- [ ] **Step 1: Create the component with Canvas generation**

Create `frontend/src/tools/ImageGeneratorTool.vue` with a Vue options API component that:

```js
export default {
  name: 'ImageGeneratorTool',
  props: {
    historyRestore: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'tool-action', 'open-history'],
}
```

The component must use:

```js
import ToolPanel from '../components/ToolPanel.vue'
import ToolWorkspace from '../components/ToolWorkspace.vue'
import {
  buildImageFileName,
  calculateBackgroundRect,
  calculateTextBlock,
  calculateWatermarkRect,
  formatBytes,
  getFormatConfig,
  getOutputDimensions,
  imageFormats,
  normalizeQuality,
  validateCrop,
  validateImageSize,
} from '../utils/imageTool'
import { emitToolAction } from './toolUi'
```

The component state must start with:

```js
data() {
  return {
    formats: imageFormats,
    width: 800,
    height: 450,
    format: 'png',
    quality: 0.9,
    transparentBackground: false,
    backgroundColor: '#ffffff',
    backgroundFit: 'cover',
    backgroundImage: null,
    backgroundImageName: '',
    text: 'AhuTools',
    fontSize: 48,
    textColor: '#111827',
    textBold: true,
    textOpacity: 1,
    textAlign: 'center',
    textVerticalAlign: 'middle',
    watermarkEnabled: false,
    watermarkImage: null,
    watermarkImageName: '',
    watermarkPosition: 'bottom-right',
    watermarkOpacity: 0.35,
    watermarkScale: 0.2,
    watermarkMargin: 24,
    cropEnabled: false,
    cropX: 0,
    cropY: 0,
    cropWidth: 800,
    cropHeight: 450,
    outputBlob: null,
    previewUrl: '',
    outputMeta: null,
    warning: '',
    error: '',
  }
}
```

The component must expose these computed percent helpers for Element Plus sliders:

```js
computed: {
  qualityPercent: {
    get() {
      return Math.round(this.quality * 100)
    },
    set(value) {
      this.quality = Number(value) / 100
    },
  },
  textOpacityPercent: {
    get() {
      return Math.round(this.textOpacity * 100)
    },
    set(value) {
      this.textOpacity = Number(value) / 100
    },
  },
  watermarkOpacityPercent: {
    get() {
      return Math.round(this.watermarkOpacity * 100)
    },
    set(value) {
      this.watermarkOpacity = Number(value) / 100
    },
  },
  watermarkScalePercent: {
    get() {
      return Math.round(this.watermarkScale * 100)
    },
    set(value) {
      this.watermarkScale = Number(value) / 100
    },
  },
}
```

The template must render five input sections with Element Plus controls:

```html
<ToolWorkspace>
  <template #input>
    <ToolPanel title="图片配置" description="生成指定尺寸、格式、文字、背景和水印的图片。">
      <template #actions>
        <el-button type="primary" @click="generateImage">生成预览</el-button>
        <el-button :disabled="!outputBlob" @click="downloadImage">下载图片</el-button>
        <el-button @click="resetForm">重置</el-button>
      </template>
      <el-form label-position="top" class="image-generator-form">
        <section class="image-generator-section">
          <h4>基础设置</h4>
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="宽度">
                <el-input-number v-model="width" :min="1" :max="8000" class="full-width" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="高度">
                <el-input-number v-model="height" :min="1" :max="8000" class="full-width" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="图片格式">
                <el-radio-group v-model="format">
                  <el-radio-button v-for="item in formats" :key="item.key" :label="item.key">{{ item.label }}</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item :label="format === 'png' ? '压缩质量（PNG 无损，不适用）' : '压缩质量'">
                <el-slider v-model="qualityPercent" :min="10" :max="100" :step="5" :disabled="format === 'png'" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-checkbox v-model="transparentBackground" :disabled="format === 'jpeg'">透明背景</el-checkbox>
        </section>

        <section class="image-generator-section">
          <h4>背景</h4>
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="背景色">
                <el-color-picker v-model="backgroundColor" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="填充方式">
                <el-select v-model="backgroundFit" class="full-width">
                  <el-option label="等比覆盖" value="cover" />
                  <el-option label="等比完整" value="contain" />
                  <el-option label="拉伸" value="stretch" />
                  <el-option label="平铺" value="tile" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="handleBackgroundChange">
            <el-button>选择背景图</el-button>
          </el-upload>
          <div class="image-upload-summary"><span>{{ backgroundImageName || '未选择背景图' }}</span></div>
        </section>

        <section class="image-generator-section">
          <h4>文字</h4>
          <el-form-item label="文字内容">
            <el-input v-model="text" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="请输入图片文字" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :xs="24" :md="8">
              <el-form-item label="字号">
                <el-input-number v-model="fontSize" :min="8" :max="400" class="full-width" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="文字颜色">
                <el-color-picker v-model="textColor" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item label="文字透明度">
                <el-slider v-model="textOpacityPercent" :min="10" :max="100" :step="5" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :xs="24" :md="8">
              <el-checkbox v-model="textBold">粗体</el-checkbox>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-select v-model="textAlign" class="full-width">
                <el-option label="左" value="left" />
                <el-option label="中" value="center" />
                <el-option label="右" value="right" />
              </el-select>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-select v-model="textVerticalAlign" class="full-width">
                <el-option label="上" value="top" />
                <el-option label="中" value="middle" />
                <el-option label="下" value="bottom" />
              </el-select>
            </el-col>
          </el-row>
        </section>

        <section class="image-generator-section">
          <h4>水印</h4>
          <el-checkbox v-model="watermarkEnabled">启用水印</el-checkbox>
          <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="handleWatermarkChange">
            <el-button>选择水印图</el-button>
          </el-upload>
          <div class="image-upload-summary"><span>{{ watermarkImageName || '未选择水印图' }}</span></div>
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="水印位置">
                <el-select v-model="watermarkPosition" class="full-width">
                  <el-option label="左上" value="top-left" />
                  <el-option label="上中" value="top-center" />
                  <el-option label="右上" value="top-right" />
                  <el-option label="左中" value="middle-left" />
                  <el-option label="居中" value="middle-center" />
                  <el-option label="右中" value="middle-right" />
                  <el-option label="左下" value="bottom-left" />
                  <el-option label="下中" value="bottom-center" />
                  <el-option label="右下" value="bottom-right" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="边距">
                <el-input-number v-model="watermarkMargin" :min="0" :max="800" class="full-width" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="水印透明度">
            <el-slider v-model="watermarkOpacityPercent" :min="5" :max="100" :step="5" />
          </el-form-item>
          <el-form-item label="水印宽度比例">
            <el-slider v-model="watermarkScalePercent" :min="5" :max="100" :step="5" />
          </el-form-item>
        </section>

        <section class="image-generator-section">
          <h4>裁剪</h4>
          <el-checkbox v-model="cropEnabled">启用裁剪</el-checkbox>
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="X">
                <el-input-number v-model="cropX" :min="0" :max="width - 1" class="full-width" :disabled="!cropEnabled" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="Y">
                <el-input-number v-model="cropY" :min="0" :max="height - 1" class="full-width" :disabled="!cropEnabled" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="裁剪宽度">
                <el-input-number v-model="cropWidth" :min="1" :max="width" class="full-width" :disabled="!cropEnabled" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="裁剪高度">
                <el-input-number v-model="cropHeight" :min="1" :max="height" class="full-width" :disabled="!cropEnabled" />
              </el-form-item>
            </el-col>
          </el-row>
        </section>
      </el-form>
    </ToolPanel>
  </template>
  <template #result>
    <ToolPanel title="预览" :description="outputMeta ? '生成后的图片预览。' : '点击生成预览后显示图片。'">
      <el-alert v-if="error" :title="error" type="error" show-icon />
      <el-alert v-if="warning" :title="warning" type="warning" show-icon class="tool-feedback" />
      <div v-if="previewUrl" class="image-generator-preview">
        <img :src="previewUrl" alt="生成图片预览" />
      </div>
      <div v-else class="tool-empty-result">暂无预览</div>
    </ToolPanel>
  </template>
</ToolWorkspace>
```

Implement browser methods with these exact responsibilities:

```js
methods: {
  async loadSelectedImage(file) {
    const url = URL.createObjectURL(file)
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image()
        element.onload = () => resolve(element)
        element.onerror = () => reject(new Error('图片格式不受支持或文件已损坏'))
        element.src = url
      })
      return image
    } finally {
      URL.revokeObjectURL(url)
    }
  },
  async handleBackgroundChange(file) {
    const raw = file?.raw
    if (!raw) return
    try {
      this.backgroundImage = await this.loadSelectedImage(raw)
      this.backgroundImageName = raw.name
    } catch {
      this.backgroundImage = null
      this.backgroundImageName = ''
      this.error = '图片读取失败，请重新选择文件'
    }
  },
  async handleWatermarkChange(file) {
    const raw = file?.raw
    if (!raw) return
    try {
      this.watermarkImage = await this.loadSelectedImage(raw)
      this.watermarkImageName = raw.name
      this.watermarkEnabled = true
    } catch {
      this.watermarkImage = null
      this.watermarkImageName = ''
      this.error = '图片读取失败，请重新选择文件'
    }
  },
  drawBackground(ctx, canvasSize, formatConfig) {
    if (!this.transparentBackground || !formatConfig.supportsTransparency) {
      ctx.fillStyle = formatConfig.key === 'jpeg' && this.transparentBackground ? '#ffffff' : this.backgroundColor
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
    }
    if (!this.backgroundImage) return
    if (this.backgroundFit === 'tile') {
      const pattern = ctx.createPattern(this.backgroundImage, 'repeat')
      if (pattern) {
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
      }
      return
    }
    const rect = calculateBackgroundRect(this.backgroundFit, this.backgroundImage, canvasSize)
    ctx.drawImage(this.backgroundImage, rect.sx, rect.sy, rect.sWidth, rect.sHeight, rect.dx, rect.dy, rect.dWidth, rect.dHeight)
  },
  drawText(ctx, canvasSize) {
    const lines = String(this.text || '').split('\n').filter((line) => line.length)
    if (!lines.length) return
    ctx.save()
    ctx.globalAlpha = this.textOpacity
    ctx.fillStyle = this.textColor
    ctx.font = `${this.textBold ? '700' : '400'} ${this.fontSize}px Arial, sans-serif`
    const block = calculateTextBlock({
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      lines,
      fontSize: this.fontSize,
      horizontal: this.textAlign,
      vertical: this.textVerticalAlign,
    })
    ctx.textAlign = block.align
    ctx.textBaseline = block.baseline
    lines.forEach((line, index) => {
      ctx.fillText(line, block.x, block.y + index * block.lineHeight)
    })
    ctx.restore()
  },
  drawWatermark(ctx, canvasSize) {
    if (!this.watermarkEnabled || !this.watermarkImage) return
    const rect = calculateWatermarkRect(this.watermarkPosition, this.watermarkImage, canvasSize, this.watermarkScale, this.watermarkMargin)
    ctx.save()
    ctx.globalAlpha = this.watermarkOpacity
    ctx.drawImage(this.watermarkImage, rect.x, rect.y, rect.width, rect.height)
    ctx.restore()
  },
}
```

- [ ] **Step 2: Implement generate, crop, preview, download, reset, and history restore**

Add methods:

```js
async generateImage() {
  const sizeResult = validateImageSize(this.width, this.height)
  if (!sizeResult.ok) {
    this.error = sizeResult.error
    return
  }
  const formatConfig = getFormatConfig(this.format)
  if (!formatConfig) {
    this.error = '图片格式无效，请选择 PNG、JPEG 或 WebP'
    return
  }
  const qualityResult = normalizeQuality(this.format, this.quality)
  if (!qualityResult.ok) {
    this.error = qualityResult.error
    return
  }
  const cropResult = validateCrop({
    enabled: this.cropEnabled,
    x: this.cropX,
    y: this.cropY,
    width: this.cropWidth,
    height: this.cropHeight,
  }, sizeResult.value)
  if (!cropResult.ok) {
    this.error = cropResult.error
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = sizeResult.value.width
  canvas.height = sizeResult.value.height
  const ctx = canvas.getContext('2d')
  this.drawBackground(ctx, sizeResult.value, formatConfig)
  this.drawText(ctx, sizeResult.value)
  this.drawWatermark(ctx, sizeResult.value)

  const outputCanvas = cropResult.value ? this.cropCanvas(canvas, cropResult.value) : canvas
  const blob = await this.canvasToBlob(outputCanvas, formatConfig.mime, qualityResult.value)
  this.setOutput(blob, getOutputDimensions(sizeResult.value, cropResult.value), formatConfig)
  this.warning = sizeResult.value.warning
  this.error = ''
  this.recordHistory(true)
},
cropCanvas(sourceCanvas, crop) {
  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  canvas.getContext('2d').drawImage(sourceCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
  return canvas
},
canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('图片导出失败，请调整格式或尺寸后重试'))
    }, mime, quality)
  })
},
setOutput(blob, dimensions, formatConfig) {
  if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
  this.outputBlob = blob
  this.previewUrl = URL.createObjectURL(blob)
  this.outputMeta = {
    width: dimensions.width,
    height: dimensions.height,
    format: formatConfig.label,
    size: formatBytes(blob.size),
  }
},
downloadImage() {
  if (!this.outputBlob) return
  const link = document.createElement('a')
  const url = URL.createObjectURL(this.outputBlob)
  link.href = url
  link.download = buildImageFileName(this.format)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  this.$emit('toast', { message: '图片下载已开始', type: 'success' })
},
```

- [ ] **Step 3: Run build**

Run:

```bash
npm run build --prefix frontend
```

Expected: pass.

## Task 5: Styling and Responsive Layout

**Files:**
- Modify: `frontend/src/style.css`
- Create: `frontend/src/tools/ImageGeneratorTool.vue`

- [ ] **Step 1: Add image generator styles**

Append to `frontend/src/style.css`:

```css
.image-generator-form {
  display: grid;
  gap: 18px;
}

.image-generator-section {
  display: grid;
  gap: 12px;
  padding: 12px;
  background: var(--surface-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
}

.image-generator-section h4 {
  margin: 0;
  color: #111827;
  font-size: 0.94rem;
}

.image-upload-summary {
  display: flex;
  min-width: 0;
  gap: 8px;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.image-upload-summary span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-generator-preview {
  display: grid;
  width: 100%;
  min-height: 240px;
  padding: 12px;
  overflow: auto;
  background: #f8fafc;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  place-items: center;
}

.image-generator-preview img {
  max-width: 100%;
  max-height: 68vh;
  object-fit: contain;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: var(--shadow-subtle);
}

.image-generator-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.image-generator-meta-item {
  display: grid;
  gap: 4px;
  padding: 10px;
  background: var(--surface-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
}

.image-generator-meta-item strong {
  color: #111827;
}

.image-generator-meta-item span {
  color: var(--text-muted);
}
```

- [ ] **Step 2: Run build after CSS and template integration**

Run:

```bash
npm run build --prefix frontend
```

Expected: pass.

## Task 6: History and State Polish

**Files:**
- Modify: `frontend/src/tools/ImageGeneratorTool.vue`

- [ ] **Step 1: Save only serializable image generator history**

Add a `getHistorySnapshot()` method:

```js
getHistorySnapshot() {
  return {
    width: this.width,
    height: this.height,
    format: this.format,
    quality: this.quality,
    transparentBackground: this.transparentBackground,
    backgroundColor: this.backgroundColor,
    backgroundFit: this.backgroundFit,
    text: this.text,
    fontSize: this.fontSize,
    textColor: this.textColor,
    textBold: this.textBold,
    textOpacity: this.textOpacity,
    textAlign: this.textAlign,
    textVerticalAlign: this.textVerticalAlign,
    watermarkEnabled: this.watermarkEnabled,
    watermarkPosition: this.watermarkPosition,
    watermarkOpacity: this.watermarkOpacity,
    watermarkScale: this.watermarkScale,
    watermarkMargin: this.watermarkMargin,
    cropEnabled: this.cropEnabled,
    cropX: this.cropX,
    cropY: this.cropY,
    cropWidth: this.cropWidth,
    cropHeight: this.cropHeight,
  }
}
```

Use `emitToolAction` in `recordHistory(success)`:

```js
recordHistory(success) {
  emitToolAction(this, {
    toolKey: 'image-generator',
    action: '生成图片',
    success,
    inputSnapshot: this.getHistorySnapshot(),
    inputSummary: `${this.width}×${this.height} · ${this.format.toUpperCase()}`,
  })
}
```

- [ ] **Step 2: Restore history without restoring image files**

Add a watcher:

```js
watch: {
  format() {
    if (this.format === 'jpeg' && this.transparentBackground) {
      this.transparentBackground = false
    }
  },
  historyRestore(newValue, oldValue) {
    if (newValue?.toolKey !== 'image-generator' || newValue.id === oldValue?.id) return
    const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
    Object.assign(this, {
      width: snapshot.width || 800,
      height: snapshot.height || 450,
      format: snapshot.format || 'png',
      quality: snapshot.quality || 0.9,
      transparentBackground: Boolean(snapshot.transparentBackground),
      backgroundColor: snapshot.backgroundColor || '#ffffff',
      backgroundFit: snapshot.backgroundFit || 'cover',
      text: snapshot.text || '',
      fontSize: snapshot.fontSize || 48,
      textColor: snapshot.textColor || '#111827',
      textBold: snapshot.textBold !== false,
      textOpacity: snapshot.textOpacity ?? 1,
      textAlign: snapshot.textAlign || 'center',
      textVerticalAlign: snapshot.textVerticalAlign || 'middle',
      watermarkEnabled: Boolean(snapshot.watermarkEnabled),
      watermarkPosition: snapshot.watermarkPosition || 'bottom-right',
      watermarkOpacity: snapshot.watermarkOpacity ?? 0.35,
      watermarkScale: snapshot.watermarkScale ?? 0.2,
      watermarkMargin: snapshot.watermarkMargin ?? 24,
      cropEnabled: Boolean(snapshot.cropEnabled),
      cropX: snapshot.cropX || 0,
      cropY: snapshot.cropY || 0,
      cropWidth: snapshot.cropWidth || snapshot.width || 800,
      cropHeight: snapshot.cropHeight || snapshot.height || 450,
    })
    this.backgroundImage = null
    this.backgroundImageName = ''
    this.watermarkImage = null
    this.watermarkImageName = ''
    this.outputBlob = null
    this.outputMeta = null
    this.error = ''
    this.warning = '已恢复配置；背景图和水印图需要重新选择'
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl)
      this.previewUrl = ''
    }
  },
}
```

- [ ] **Step 3: Run frontend tests and build**

Run:

```bash
npm run test --prefix frontend
npm run build --prefix frontend
```

Expected: both pass.

## Task 7: Manual Verification

**Files:**
- Verify: `frontend/src/tools/ImageGeneratorTool.vue`
- Verify: `frontend/src/utils/imageTool.js`
- Verify: `frontend/src/style.css`

- [ ] **Step 1: Start the Vite dev server**

Run:

```bash
npm run dev --prefix frontend
```

Expected: Vite serves the frontend on a localhost URL.

- [ ] **Step 2: Browser smoke checks**

Open the Vite URL and verify:

```text
图片生成 appears in the sidebar.
800 x 450 PNG with AhuTools centered generates a preview.
PNG quality control is disabled or marked unavailable.
JPEG and WebP quality controls are enabled.
Background image upload changes the preview.
Watermark upload with bottom-right position appears over the image.
Crop enabled with 100,50,300,200 outputs a 300 x 200 preview.
Crop enabled with 700,50,200,200 shows 裁剪区域不能超出画布范围.
Download starts with an ahu-tools-image-*.png/jpg/webp filename.
```

- [ ] **Step 3: Stop the dev server**

Stop the Vite process with `Ctrl+C`.

## Task 8: Final Verification and Commit

**Files:**
- Verify: all changed files

- [ ] **Step 1: Review changed files**

Run:

```bash
git diff -- frontend/src/utils/imageTool.js frontend/src/utils/imageTool.test.js frontend/src/tools/ImageGeneratorTool.vue frontend/src/tools/index.js frontend/src/style.css
```

Expected: diff only contains image generator implementation and registration.

- [ ] **Step 2: Run final verification**

Run:

```bash
npm run test --prefix frontend
npm run build --prefix frontend
```

Expected: both pass.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add frontend/src/utils/imageTool.js frontend/src/utils/imageTool.test.js frontend/src/tools/ImageGeneratorTool.vue frontend/src/tools/index.js frontend/src/style.css
git commit -m "feat: add image generator tool"
```

Expected: commit succeeds with only image generator files staged.
