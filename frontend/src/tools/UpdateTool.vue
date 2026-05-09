<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>应用更新</h2>
          <p>从 GitHub Release 检查最新版本，并下载当前平台安装包/可执行产物。</p>
        </div>
        <el-button type="primary" :loading="checking" @click="checkUpdate">
          检查更新
        </el-button>
      </div>
    </template>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-alert v-if="message" :title="message" type="info" show-icon :closable="false" class="tool-feedback" />

    <el-card v-if="info" class="result-container update-info" shadow="never">
      <div v-if="info.asset" class="update-action-bar">
        <div>
          <strong>{{ info.asset.name }}</strong>
          <span>{{ formatSize(info.asset.size) }}</span>
        </div>
        <el-button type="primary" :loading="downloading || installing" @click="downloadUpdate">
          下载并安装
        </el-button>
      </div>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="当前版本">{{ info.currentVersion }}</el-descriptions-item>
        <el-descriptions-item v-if="info.latestVersion" label="最新版本">{{ info.latestVersion }}</el-descriptions-item>
        <el-descriptions-item label="当前平台">{{ info.platform }}</el-descriptions-item>
        <el-descriptions-item v-if="info.publishedAt" label="发布时间">{{ info.publishedAt }}</el-descriptions-item>
        <el-descriptions-item v-if="info.releaseUrl" label="Release">
          <a :href="info.releaseUrl" target="_blank">{{ info.releaseName || info.releaseUrl }}</a>
        </el-descriptions-item>
      </el-descriptions>

      <el-card v-if="info.releaseNotes" class="nested-result-card" shadow="never">
        <template #header>Release Notes</template>
        <pre class="result-json">{{ info.releaseNotes }}</pre>
      </el-card>
    </el-card>
  </el-card>
</template>

<script>
import { ElMessageBox } from 'element-plus'
import { CheckForUpdate, DownloadUpdate, InstallDownloadedUpdate } from '../services/wailsApi'

export default {
  name: 'UpdateTool',
  props: {
    initialInfo: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'checked'],
  data() {
    return {
      checking: false,
      downloading: false,
      installing: false,
      info: null,
      error: '',
      message: '点击“检查更新”获取最新 GitHub Release 信息。',
    }
  },
  watch: {
    initialInfo: {
      immediate: true,
      handler(info) {
        if (info) {
          this.applyUpdateInfo(info)
        }
      },
    },
  },
  methods: {
    async checkUpdate() {
      this.checking = true
      this.error = ''
      this.message = ''
      this.info = null

      try {
        const info = await CheckForUpdate()
        this.applyUpdateInfo(info)
        this.$emit('checked', info)
      } catch {
        this.error = '调用更新服务失败，请稍后重试'
        this.$emit('checked', null)
      } finally {
        this.checking = false
      }
    },
    applyUpdateInfo(info) {
      this.info = info
      if (info.success) {
        this.message = info.message || ''
        this.error = ''
      } else {
        this.error = info.error || '检查更新失败，请稍后重试'
        this.message = ''
      }
    },
    async downloadUpdate() {
      if (!this.info?.asset) return

      try {
        await ElMessageBox.confirm(
          '下载完成后将自动启动安装流程，并退出当前应用。是否继续？',
          '安装更新',
          {
            confirmButtonText: '继续',
            cancelButtonText: '取消',
            type: 'warning',
          },
        )
      } catch {
        return
      }

      this.downloading = true
      this.error = ''
      this.message = ''

      try {
        const response = await DownloadUpdate(this.info.asset)
        if (response.success) {
          this.downloading = false
          await this.installUpdate(response.path)
        } else if (response.cancelled) {
          this.message = response.message || '已取消保存'
        } else {
          this.error = response.error || '下载失败，请稍后重试'
        }
      } catch {
        this.error = '调用下载服务失败，请稍后重试'
      } finally {
        this.downloading = false
      }
    },
    async installUpdate(path) {
      this.installing = true
      this.error = ''
      this.message = ''

      try {
        const response = await InstallDownloadedUpdate(path)
        if (response.success) {
          this.message = response.message || '安装程序已启动，应用即将退出'
          this.$emit('toast', { message: this.message, type: 'success' })
        } else {
          this.error = response.error || '启动安装失败，请手动打开安装包'
        }
      } catch {
        this.error = '调用安装服务失败，请手动打开安装包'
      } finally {
        this.installing = false
      }
    },
    formatSize(size) {
      if (!size) return '未知'
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      return `${(size / 1024 / 1024).toFixed(1)} MB`
    },
  },
}
</script>
