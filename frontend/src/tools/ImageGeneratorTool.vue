<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="图片配置" description="生成指定尺寸、格式、文字、背景和水印的图片。">
        <template #actions>
          <el-button type="primary" :loading="isGeneratingPreview" @click="generateImage">生成预览</el-button>
          <el-button :disabled="!outputBlob || savingImage" :loading="savingImage" @click="downloadImage">下载图片</el-button>
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
                    <el-radio-button v-for="item in formats" :key="item.key" :label="item.key">
                      {{ item.label }}
                    </el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item :label="qualityControlLabel">
                  <el-slider v-model="qualityPercent" :min="10" :max="100" :step="5" :disabled="format === 'png'" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-checkbox v-model="transparentBackground" :true-value="true" :false-value="false" :disabled="format === 'jpeg'">
              透明背景
            </el-checkbox>
          </section>

          <section class="image-generator-section">
            <h4>背景</h4>
            <el-form-item label="背景来源">
              <el-radio-group v-model="backgroundMode">
                <el-radio-button label="theme">主题</el-radio-button>
                <el-radio-button label="color">纯色</el-radio-button>
                <el-radio-button label="image" :disabled="!backgroundImage">背景图</el-radio-button>
              </el-radio-group>
            </el-form-item>

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

            <div v-if="backgroundMode === 'theme'" class="image-theme-controls">
              <el-form-item label="主题风格">
                <el-select v-model="themeType" class="full-width">
                  <el-option v-for="item in themes" :key="item.key" :label="item.label" :value="item.key" />
                </el-select>
              </el-form-item>
              <div class="image-theme-actions">
                <el-button @click="randomizeTheme">随机一次</el-button>
                <el-checkbox v-model="themeLocked" :true-value="true" :false-value="false">锁定样式</el-checkbox>
                <span>{{ currentThemeLabel }} · #{{ themeSeed }}</span>
              </div>
            </div>

            <div class="image-upload-row">
              <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="handleBackgroundChange">
                <el-button>选择背景图</el-button>
              </el-upload>
              <div class="image-upload-summary">
                <span>{{ backgroundImageName || '未选择背景图' }}</span>
                <el-button v-if="backgroundImage" text @click="clearBackgroundImage">移除</el-button>
              </div>
            </div>
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
                <el-form-item label="字重">
                  <el-checkbox v-model="textBold" :true-value="true" :false-value="false">粗体</el-checkbox>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="8">
                <el-form-item label="水平位置">
                  <el-select v-model="textAlign" class="full-width">
                    <el-option label="左" value="left" />
                    <el-option label="中" value="center" />
                    <el-option label="右" value="right" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="8">
                <el-form-item label="垂直位置">
                  <el-select v-model="textVerticalAlign" class="full-width">
                    <el-option label="上" value="top" />
                    <el-option label="中" value="middle" />
                    <el-option label="下" value="bottom" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </section>

          <section class="image-generator-section">
            <h4>水印</h4>
            <el-checkbox v-model="watermarkEnabled" :true-value="true" :false-value="false">启用水印</el-checkbox>

            <div class="image-upload-row">
              <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="handleWatermarkChange">
                <el-button>选择水印图</el-button>
              </el-upload>
              <div class="image-upload-summary">
                <span>{{ watermarkImageName || '未选择水印图' }}</span>
                <el-button v-if="watermarkImage" text @click="clearWatermarkImage">移除</el-button>
              </div>
            </div>

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
            <el-checkbox v-model="cropEnabled" :true-value="true" :false-value="false">启用裁剪</el-checkbox>

            <el-row :gutter="16">
              <el-col :xs="24" :md="12">
                <el-form-item label="X">
                  <el-input-number v-model="cropX" :min="0" :max="Math.max(0, width - 1)" class="full-width" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="Y">
                  <el-input-number v-model="cropY" :min="0" :max="Math.max(0, height - 1)" class="full-width" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :xs="24" :md="12">
                <el-form-item label="裁剪宽度">
                  <el-input-number v-model="cropWidth" :min="1" :max="width" class="full-width" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="裁剪高度">
                  <el-input-number v-model="cropHeight" :min="1" :max="height" class="full-width" />
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
          <img :src="previewUrl" alt="生成图片预览">
        </div>
        <div v-else class="tool-empty-result">暂无预览</div>

        <div v-if="outputMeta" class="image-generator-meta">
          <div class="image-generator-meta-item">
            <strong>{{ outputMeta.width }} × {{ outputMeta.height }}</strong>
            <span>输出尺寸</span>
          </div>
          <div class="image-generator-meta-item">
            <strong>{{ outputMeta.format }}</strong>
            <span>图片格式</span>
          </div>
          <div class="image-generator-meta-item">
            <strong>{{ outputMeta.quality }}</strong>
            <span>压缩质量</span>
          </div>
          <div class="image-generator-meta-item">
            <strong>{{ outputMeta.size }}</strong>
            <span>文件大小</span>
          </div>
        </div>
      </ToolPanel>
    </template>
  </ToolWorkspace>
</template>

<script>
import ToolPanel from '../components/ToolPanel.vue'
import ToolWorkspace from '../components/ToolWorkspace.vue'
import { SaveGeneratedImage } from '../services/wailsApi'
import {
  buildImageAutoPreviewSignature,
  buildThemeConfig,
  buildImageFileName,
  calculateBackgroundRect,
  calculateTextBlock,
  calculateWatermarkRect,
  createAutoPreviewScheduler,
  createThemeSeed,
  formatBytes,
  getFormatConfig,
  getOutputDimensions,
  imageThemes,
  imageFormats,
  normalizeQuality,
  validateCrop,
  validateImageSize,
} from '../utils/imageTool'
import { emitToolAction } from './toolUi'

function createDefaultState() {
  const themeType = 'aurora'
  const themeSeed = createThemeSeed()
  const themeConfig = buildThemeConfig(themeType, themeSeed)

  return {
    formats: imageFormats,
    width: 800,
    height: 450,
    format: 'png',
    quality: 0.9,
    transparentBackground: false,
    backgroundColor: '#ffffff',
    backgroundMode: 'theme',
    backgroundFit: 'cover',
    backgroundImage: null,
    backgroundImageName: '',
    themes: imageThemes,
    themeType,
    themeSeed,
    themeLocked: false,
    text: 'AhuTools',
    fontSize: 48,
    textColor: themeConfig.textColor,
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
    autoPreviewActive: false,
    isGeneratingPreview: false,
    savingImage: false,
    warning: '',
    error: '',
  }
}

function isImageFile(file) {
  return file?.type?.startsWith('image/')
}

export default {
  name: 'ImageGeneratorTool',
  components: {
    ToolPanel,
    ToolWorkspace,
  },
  props: {
    historyRestore: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'tool-action', 'open-history'],
  data() {
    return createDefaultState()
  },
  computed: {
    qualityControlLabel() {
      return this.format === 'png' ? '压缩质量（PNG 无损，不适用）' : '压缩质量'
    },
    currentThemeConfig() {
      return buildThemeConfig(this.themeType, this.themeSeed)
    },
    currentThemeLabel() {
      return this.currentThemeConfig.label
    },
    autoPreviewSignature() {
      return buildImageAutoPreviewSignature(this)
    },
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
  },
  watch: {
    autoPreviewSignature() {
      this.scheduleAutoGenerate()
    },
    format() {
      if (this.format === 'jpeg' && this.transparentBackground) {
        this.transparentBackground = false
      }
    },
    width() {
      this.syncCropWithCanvasSize()
    },
    height() {
      this.syncCropWithCanvasSize()
    },
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'image-generator' || newValue.id === oldValue?.id) return
      this.restoreHistory(newValue.inputSnapshot || newValue.snapshot || {})
    },
  },
  created() {
    this.autoPreviewScheduler = createAutoPreviewScheduler(() => {
      if (!this.autoPreviewActive) return
      this.generateImage({
        record: false,
        activateAutoPreview: false,
        refreshRandomTheme: false,
      })
    })
  },
  beforeUnmount() {
    this.autoPreviewScheduler?.dispose()
    this.revokePreviewUrl()
  },
  methods: {
    async loadSelectedImage(file) {
      if (!isImageFile(file)) {
        throw new Error('图片格式不受支持或文件已损坏')
      }

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
        this.backgroundMode = 'image'
        this.error = ''
        this.scheduleAutoGenerate()
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
        this.error = ''
        this.scheduleAutoGenerate()
      } catch {
        this.watermarkImage = null
        this.watermarkImageName = ''
        this.error = '图片读取失败，请重新选择文件'
      }
    },
    clearBackgroundImage() {
      this.backgroundImage = null
      this.backgroundImageName = ''
      if (this.backgroundMode === 'image') this.backgroundMode = 'theme'
    },
    clearWatermarkImage() {
      this.watermarkImage = null
      this.watermarkImageName = ''
      this.watermarkEnabled = false
    },
    randomizeTheme() {
      this.backgroundMode = 'theme'
      this.themeSeed = createThemeSeed()
      this.textColor = this.currentThemeConfig.textColor
    },
    scheduleAutoGenerate() {
      if (!this.autoPreviewActive || this.isGeneratingPreview) return
      this.autoPreviewScheduler?.schedule()
    },
    drawBackground(ctx, canvasSize, formatConfig) {
      if (!this.transparentBackground || !formatConfig.supportsTransparency) {
        ctx.fillStyle = this.backgroundColor
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
      }

      if (this.backgroundMode === 'theme') {
        this.drawThemeBackground(ctx, canvasSize)
        return
      }

      if (!this.backgroundImage || this.backgroundMode !== 'image') return

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
    drawThemeBackground(ctx, canvasSize) {
      const theme = this.currentThemeConfig
      const { width, height } = canvasSize
      const diagonal = Math.hypot(width, height)
      const angle = (theme.gradientAngle * Math.PI) / 180
      const x = Math.cos(angle) * diagonal
      const y = Math.sin(angle) * diagonal
      const gradient = ctx.createLinearGradient(width / 2 - x / 2, height / 2 - y / 2, width / 2 + x / 2, height / 2 + y / 2)

      theme.palette.forEach((color, index) => {
        gradient.addColorStop(index / Math.max(theme.palette.length - 1, 1), color)
      })
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      if (theme.family === 'grid') {
        this.drawThemeGrid(ctx, canvasSize, theme)
      } else if (theme.family === 'paper') {
        this.drawThemePaper(ctx, canvasSize, theme)
      } else if (theme.family === 'magazine') {
        this.drawThemeMagazine(ctx, canvasSize, theme)
      } else {
        this.drawThemeShapes(ctx, canvasSize, theme)
      }
    },
    drawThemeShapes(ctx, canvasSize, theme) {
      const { width, height } = canvasSize
      const accentColors = theme.palette.slice(1)
      theme.shapes.forEach((shape, index) => {
        const size = Math.max(width, height) * shape.size
        const x = shape.x * width
        const y = shape.y * height
        ctx.save()
        ctx.globalAlpha = theme.family === 'neon' ? Math.min(shape.opacity + 0.12, 0.42) : shape.opacity
        ctx.fillStyle = accentColors[index % accentColors.length]
        ctx.strokeStyle = accentColors[(index + 1) % accentColors.length]
        ctx.lineWidth = Math.max(1, size * 0.025)
        ctx.translate(x, y)
        ctx.rotate(shape.rotation)

        if (theme.family === 'glass') {
          this.drawRoundedRectPath(ctx, -size / 2, -size / 3, size, size * 0.66, size * 0.12)
          ctx.fill()
          ctx.globalAlpha = 0.35
          ctx.stroke()
        } else if (theme.family === 'geometry' || shape.variant % 3 === 0) {
          ctx.beginPath()
          ctx.moveTo(0, -size / 2)
          ctx.lineTo(size / 2, size / 2)
          ctx.lineTo(-size / 2, size / 2)
          ctx.closePath()
          ctx.fill()
        } else {
          const radial = ctx.createRadialGradient(0, 0, 0, 0, 0, size)
          radial.addColorStop(0, accentColors[index % accentColors.length])
          radial.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = radial
          ctx.beginPath()
          ctx.arc(0, 0, size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      if (theme.family === 'neon') {
        this.drawNeonLines(ctx, canvasSize, theme)
      }
    },
    drawThemeGrid(ctx, canvasSize, theme) {
      const { width, height } = canvasSize
      const step = Math.max(28, Math.min(width, height) / 12)
      ctx.save()
      ctx.globalAlpha = 0.18
      ctx.strokeStyle = theme.palette[2]
      ctx.lineWidth = 1
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      ctx.restore()
      this.drawThemeShapes(ctx, canvasSize, theme)
    },
    drawThemePaper(ctx, canvasSize, theme) {
      const { width, height } = canvasSize
      ctx.save()
      theme.shapes.forEach((shape, index) => {
        ctx.globalAlpha = 0.05 + (index % 5) * 0.01
        ctx.fillStyle = theme.palette[index % theme.palette.length]
        ctx.beginPath()
        ctx.arc(shape.x * width, shape.y * height, Math.max(width, height) * shape.size * 0.18, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
    },
    drawThemeMagazine(ctx, canvasSize, theme) {
      const { width, height } = canvasSize
      ctx.save()
      theme.shapes.slice(0, 6).forEach((shape, index) => {
        ctx.globalAlpha = 0.12 + index * 0.02
        ctx.fillStyle = theme.palette[(index + 1) % theme.palette.length]
        ctx.translate(shape.x * width, shape.y * height)
        ctx.rotate(shape.rotation)
        ctx.fillRect(-width * 0.18, -height * 0.08, width * (0.24 + shape.size), height * 0.16)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      })
      ctx.restore()
    },
    drawNeonLines(ctx, canvasSize, theme) {
      const { width, height } = canvasSize
      ctx.save()
      ctx.globalAlpha = 0.42
      ctx.lineWidth = Math.max(2, width * 0.004)
      theme.shapes.slice(0, 8).forEach((shape, index) => {
        ctx.strokeStyle = theme.palette[(index + 2) % theme.palette.length]
        ctx.beginPath()
        ctx.moveTo(shape.x * width, shape.y * height)
        ctx.lineTo(((shape.x + 0.28) % 1) * width, ((shape.y + 0.18) % 1) * height)
        ctx.stroke()
      })
      ctx.restore()
    },
    drawRoundedRectPath(ctx, x, y, width, height, radius) {
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
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
    async generateImage(options = {}) {
      const {
        record = true,
        activateAutoPreview = true,
        refreshRandomTheme = true,
      } = options

      if (activateAutoPreview) this.autoPreviewActive = true
      this.isGeneratingPreview = true
      try {
        const sizeResult = validateImageSize(this.width, this.height)
        if (!sizeResult.ok) return this.failGeneration(sizeResult.error, { record })

        const formatConfig = getFormatConfig(this.format)
        if (!formatConfig) return this.failGeneration('图片格式无效，请选择 PNG、JPEG 或 WebP', { record })

        const qualityResult = normalizeQuality(this.format, this.quality)
        if (!qualityResult.ok) return this.failGeneration(qualityResult.error, { record })

        const cropResult = validateCrop({
          enabled: this.cropEnabled,
          x: this.cropX,
          y: this.cropY,
          width: this.cropWidth,
          height: this.cropHeight,
        }, sizeResult.value)
        if (!cropResult.ok) return this.failGeneration(cropResult.error, { record })

        if (refreshRandomTheme && this.backgroundMode === 'theme' && this.themeType === 'random' && !this.themeLocked) {
          this.themeSeed = createThemeSeed()
          this.textColor = this.currentThemeConfig.textColor
        }

        const canvas = document.createElement('canvas')
        canvas.width = sizeResult.value.width
        canvas.height = sizeResult.value.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return this.failGeneration('当前环境无法创建图片画布', { record })

        this.drawBackground(ctx, sizeResult.value, formatConfig)
        this.drawText(ctx, sizeResult.value)
        this.drawWatermark(ctx, sizeResult.value)

        const outputCanvas = cropResult.value ? this.cropCanvas(canvas, cropResult.value) : canvas
        const blob = await this.canvasToBlob(outputCanvas, formatConfig.mime, qualityResult.value)
        this.setOutput(blob, getOutputDimensions(sizeResult.value, cropResult.value), formatConfig)
        this.warning = sizeResult.value.warning
        this.error = ''
        if (record) this.recordHistory(true)
      } catch (error) {
        this.failGeneration(error?.message || '图片导出失败，请调整格式或尺寸后重试', { record })
      } finally {
        this.isGeneratingPreview = false
      }
    },
    failGeneration(message, options = {}) {
      const { record = true } = options
      this.error = message
      this.warning = ''
      this.clearOutput()
      if (record) this.recordHistory(false)
    },
    cropCanvas(sourceCanvas, crop) {
      const canvas = document.createElement('canvas')
      canvas.width = crop.width
      canvas.height = crop.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('当前环境无法创建图片画布')
      ctx.drawImage(sourceCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
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
      this.revokePreviewUrl()
      this.outputBlob = blob
      this.previewUrl = URL.createObjectURL(blob)
      this.outputMeta = {
        width: dimensions.width,
        height: dimensions.height,
        format: formatConfig.label,
        quality: formatConfig.supportsQuality ? `${Math.round(this.quality * 100)}%` : '无损',
        size: formatBytes(blob.size),
      }
    },
    async blobToBase64(blob) {
      const buffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      const chunkSize = 0x8000
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
      }
      return btoa(binary)
    },
    async downloadImage() {
      if (!this.outputBlob || this.savingImage) return

      this.savingImage = true
      try {
        const formatConfig = getFormatConfig(this.format) || getFormatConfig('png')
        const response = await SaveGeneratedImage({
          fileName: buildImageFileName(this.format),
          extension: formatConfig.extension,
          mime: this.outputBlob.type || formatConfig.mime,
          dataBase64: await this.blobToBase64(this.outputBlob),
        })
        if (response?.cancelled) {
          this.$emit('toast', { message: response.message || '已取消保存', type: 'info' })
          return
        }
        if (!response?.success) {
          this.$emit('toast', { message: response?.error || '保存失败，请重新生成后再试', type: 'error' })
          return
        }
        this.$emit('toast', { message: response.message || '图片已保存', type: 'success' })
      } catch (error) {
        this.$emit('toast', { message: error?.message || '保存失败，请重新生成后再试', type: 'error' })
      } finally {
        this.savingImage = false
      }
    },
    clearOutput() {
      this.revokePreviewUrl()
      this.outputBlob = null
      this.outputMeta = null
    },
    revokePreviewUrl() {
      if (!this.previewUrl) return
      URL.revokeObjectURL(this.previewUrl)
      this.previewUrl = ''
    },
    resetForm() {
      this.autoPreviewScheduler?.dispose()
      this.revokePreviewUrl()
      Object.assign(this, createDefaultState())
    },
    syncCropWithCanvasSize() {
      const width = Number(this.width)
      const height = Number(this.height)
      if (!Number.isInteger(width) || !Number.isInteger(height)) return

      if (!this.cropEnabled) {
        this.cropX = 0
        this.cropY = 0
        this.cropWidth = width
        this.cropHeight = height
        return
      }

      this.cropX = Math.min(this.cropX, Math.max(0, width - 1))
      this.cropY = Math.min(this.cropY, Math.max(0, height - 1))
      this.cropWidth = Math.min(this.cropWidth, width)
      this.cropHeight = Math.min(this.cropHeight, height)
    },
    getHistorySnapshot() {
      return {
        width: this.width,
        height: this.height,
        format: this.format,
        quality: this.quality,
        transparentBackground: this.transparentBackground,
        backgroundColor: this.backgroundColor,
        backgroundMode: this.backgroundMode,
        backgroundFit: this.backgroundFit,
        themeType: this.themeType,
        themeSeed: this.themeSeed,
        themeLocked: this.themeLocked,
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
    },
    recordHistory(success) {
      emitToolAction(this, {
        toolKey: 'image-generator',
        action: '生成图片',
        success,
        inputSnapshot: this.getHistorySnapshot(),
        inputSummary: `${this.width}×${this.height} · ${this.format.toUpperCase()}`,
      })
    },
    restoreHistory(snapshot) {
      this.revokePreviewUrl()
      Object.assign(this, {
        width: snapshot.width || 800,
        height: snapshot.height || 450,
        format: snapshot.format || 'png',
        quality: snapshot.quality || 0.9,
        transparentBackground: Boolean(snapshot.transparentBackground),
        backgroundColor: snapshot.backgroundColor || '#ffffff',
        backgroundMode: snapshot.backgroundMode || 'theme',
        backgroundFit: snapshot.backgroundFit || 'cover',
        themeType: snapshot.themeType || 'aurora',
        themeSeed: snapshot.themeSeed || createThemeSeed(),
        themeLocked: Boolean(snapshot.themeLocked),
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
        backgroundImage: null,
        backgroundImageName: '',
        watermarkImage: null,
        watermarkImageName: '',
        outputBlob: null,
        outputMeta: null,
        autoPreviewActive: false,
        isGeneratingPreview: false,
        savingImage: false,
        error: '',
        warning: '已恢复配置；背景图和水印图需要重新选择',
      })
    },
  },
}
</script>
