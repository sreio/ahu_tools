<template>
  <el-container class="app-shell">
    <el-aside :width="sidebarWidthStyle" class="app-aside" :class="{ 'is-collapsed': sidebarCollapsed }">
      <SidebarNav
        :app-name="appName"
        :version="version"
        :author="author"
        :tools="tools"
        :recent-tools="recentTools"
        :active-tool="activeTool"
        :collapsed="sidebarCollapsed"
        :update-available="updateAvailable"
        @select-tool="selectTool"
        @toggle-collapse="toggleSidebar"
        @open-updates="showUpdates = true"
        @open-tool-order="openToolOrder"
      />
    </el-aside>

    <div v-if="!sidebarCollapsed" class="sidebar-resizer" @mousedown="startSidebarResize" />

    <el-main class="main-content">
      <component
        :is="activeToolDefinition.component"
        :configs="configs"
        :app-name="appName"
        :version="version"
        :history-restore="historyRestore"
        :h5-configs="h5Configs"
        @toast="showToast"
        @open-settings="showSettings = true"
        @open-h5-settings="showH5Settings = true"
        @open-history="openToolHistory"
        @tool-action="recordToolAction"
      />
    </el-main>

    <ConfigModal
      v-model="showSettings"
      :configs="configs"
      @save="saveConfig"
    />

    <H5ConfigModal
      v-model="showH5Settings"
      :configs="h5Configs"
      @save="saveH5Config"
    />

    <el-dialog v-model="showUpdates" title="应用更新" width="760px" destroy-on-close>
      <UpdateTool
        :initial-info="updateInfo"
        @toast="showToast"
        @checked="handleUpdateChecked"
      />
    </el-dialog>

    <el-dialog v-model="showToolOrder" title="工具排序" width="640px">
      <div class="tool-order-list">
        <div v-for="(tool, index) in draftTools" :key="tool.key" class="tool-order-item">
          <div class="tool-order-copy">
            <strong>{{ tool.name }}</strong>
            <span>{{ tool.group }} · {{ tool.description }}</span>
          </div>
          <div class="tool-order-actions">
            <el-button size="small" :disabled="index === 0" @click="moveDraftTool(index, -1)">上移</el-button>
            <el-button size="small" :disabled="index === draftTools.length - 1" @click="moveDraftTool(index, 1)">下移</el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="resetToolOrderDraft">恢复默认</el-button>
        <el-button @click="showToolOrder = false">取消</el-button>
        <el-button type="primary" @click="saveToolOrder">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="showToolHistory" :title="historyDrawerTitle" direction="rtl" size="420px">
      <el-alert
        title="只保存输入内容，不保存解析后的结果或输出。"
        type="info"
        show-icon
        :closable="false"
        class="tool-feedback"
      />
      <div v-if="filteredToolHistory.length" class="history-list">
        <button
          v-for="item in filteredToolHistory"
          :key="item.id"
          class="history-item"
          type="button"
          @click="restoreHistoryItem(item)"
        >
          <div class="history-copy">
            <strong>{{ item.action }}</strong>
            <span>{{ item.inputSummary || '输入历史' }}</span>
            <small>{{ formatHistoryTime(item.createdAt) }}</small>
          </div>
          <el-tag :type="item.success ? 'success' : 'danger'">{{ item.success ? '成功' : '失败' }}</el-tag>
        </button>
      </div>
      <el-empty v-else description="暂无输入历史" />
      <template #footer>
        <div class="history-actions">
          <el-button :disabled="!toolHistory.length" @click="clearToolHistory">清空历史</el-button>
          <el-button type="primary" @click="showToolHistory = false">关闭</el-button>
        </div>
      </template>
    </el-drawer>
  </el-container>
</template>

<script>
import { ElMessage } from 'element-plus'
import ConfigModal from './components/ConfigModal.vue'
import H5ConfigModal from './components/H5ConfigModal.vue'
import SidebarNav from './components/SidebarNav.vue'
import {
  CheckForUpdate,
  ClearToolHistory,
  GetAllConfigs,
  GetAllH5DecryptConfigs,
  GetAppName,
  GetAuthor,
  GetToolHistory,
  GetToolOrder,
  GetVersion,
  RecordToolHistory,
  SaveConfig,
  SaveH5DecryptConfig,
  SaveToolOrder,
} from './services/wailsApi'
import { tools as defaultTools } from './tools'
import { applySavedToolOrder, normalizeToolOrder } from './tools/order'
import UpdateTool from './tools/UpdateTool.vue'
import { getUtf8ByteLength } from './utils/devTools'

const h5ConfigByteLengthRules = [
  { field: 'request_aes_256_cbc_iv', bytes: 16, message: '请求 AES_256_CBC_IV 必须为16字节' },
  { field: 'request_aes_256_cbc_key', bytes: 32, message: '请求 AES_256_CBC_KEY 必须为32字节' },
  { field: 'response_aes_256_cbc_iv', bytes: 16, message: '响应 AES_256_CBC_IV 必须为16字节' },
  { field: 'response_aes_256_cbc_key', bytes: 32, message: '响应 AES_256_CBC_KEY 必须为32字节' },
]

function trimValue(value) {
  return value?.trim() || ''
}

function getFirstByteLengthError(config, rules) {
  return rules.find(({ field, bytes }) => config[field] && getUtf8ByteLength(config[field]) !== bytes)?.message
}

export default {
  name: 'App',
  components: {
    ConfigModal,
    H5ConfigModal,
    SidebarNav,
    UpdateTool,
  },
  data() {
    return {
      tools: [...defaultTools],
      activeTool: 'decrypt',
      appName: 'IT工具箱',
      version: '1.1.9',
      author: 'sreio',
      configs: [],
      h5Configs: [],
      showSettings: false,
      showH5Settings: false,
      showUpdates: false,
      showToolOrder: false,
      showToolHistory: false,
      historyToolKey: '',
      historyRestore: null,
      draftToolOrder: [],
      toolHistory: [],
      recentTools: [],
      updateInfo: null,
      updateAvailable: false,
      sidebarWidth: 280,
      sidebarCollapsed: false,
      resizingSidebar: false,
    }
  },
  computed: {
    activeToolDefinition() {
      return this.tools.find((tool) => tool.key === this.activeTool) || this.tools[0]
    },
    sidebarWidthStyle() {
      return this.sidebarCollapsed ? '76px' : `${this.sidebarWidth}px`
    },
    draftTools() {
      const toolByKey = new Map(defaultTools.map((tool) => [tool.key, tool]))
      return this.draftToolOrder.map((key) => toolByKey.get(key)).filter(Boolean)
    },
    historyDrawerTitle() {
      const toolName = this.getToolName(this.historyToolKey || this.activeTool)
      return `${toolName}历史记录`
    },
    filteredToolHistory() {
      const toolKey = this.historyToolKey || this.activeTool
      return this.toolHistory.filter((item) => item.toolKey === toolKey)
    },
  },
  async mounted() {
    await this.loadAppInfo()
    await this.loadToolOrder()
    await this.loadToolHistory()
    await this.loadConfigs()
    await this.loadH5Config()
    await this.checkUpdateSilently()
  },
  beforeUnmount() {
    this.stopSidebarResize()
  },
  methods: {
    async loadAppInfo() {
      try {
        this.appName = await GetAppName()
        this.version = await GetVersion()
        this.author = await GetAuthor()
      } catch {
        this.showToast({ message: '加载应用信息失败', type: 'error' })
      }
    },
    async loadConfigs() {
      try {
        this.configs = await GetAllConfigs()
      } catch {
        this.showToast({ message: '加载配置失败', type: 'error' })
      }
    },
    async loadH5Config() {
      try {
        this.h5Configs = await GetAllH5DecryptConfigs()
      } catch {
        this.showToast({ message: '加载 H5 配置失败', type: 'error' })
      }
    },
    async loadToolOrder() {
      try {
        const savedOrder = await GetToolOrder()
        this.tools = applySavedToolOrder(defaultTools, savedOrder)
      } catch {
        this.tools = [...defaultTools]
        this.showToast({ message: '加载工具排序失败', type: 'error' })
      }
    },
    async loadToolHistory() {
      try {
        this.toolHistory = await GetToolHistory(50)
        this.updateRecentTools()
      } catch {
        this.toolHistory = []
        this.recentTools = []
      }
    },
    updateRecentTools() {
      const toolByKey = new Map(this.tools.map((tool) => [tool.key, tool]))
      const recent = []
      const seen = new Set()
      for (const item of this.toolHistory) {
        if (seen.has(item.toolKey)) continue
        const tool = toolByKey.get(item.toolKey)
        if (!tool) continue
        seen.add(item.toolKey)
        recent.push(tool)
        if (recent.length === 5) break
      }
      this.recentTools = recent
    },
    getToolName(toolKey) {
      return this.getToolDefinition(toolKey)?.name || toolKey
    },
    getToolDefinition(toolKey) {
      return this.tools.find((tool) => tool.key === toolKey) || defaultTools.find((tool) => tool.key === toolKey)
    },
    formatHistoryTime(value) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
    },
    selectTool(toolKey) {
      this.activeTool = toolKey
    },
    async recordToolAction(payload) {
      if (!payload?.toolKey || !payload?.action || !payload?.inputSnapshot) return
      try {
        await RecordToolHistory({
          toolKey: payload.toolKey,
          action: payload.action,
          success: Boolean(payload.success),
          inputSnapshot: payload.inputSnapshot,
          inputSummary: payload.inputSummary || '',
          schemaVersion: payload.schemaVersion || 1,
        })
        await this.loadToolHistory()
      } catch (error) {
        this.showToast({ message: error?.message || '记录输入历史失败', type: 'error' })
      }
    },
    async openToolHistory(toolKey) {
      this.historyToolKey = toolKey || this.activeTool
      await this.loadToolHistory()
      this.showToolHistory = true
    },
    restoreHistoryItem(item) {
      try {
        const snapshot = JSON.parse(item.inputSnapshot)
        this.activeTool = item.toolKey
        this.showToolHistory = false
        this.$nextTick(() => {
          this.historyRestore = {
            id: item.id,
            toolKey: item.toolKey,
            snapshot,
          }
        })
      } catch {
        this.showToast({ message: '历史记录内容无效，无法恢复', type: 'error' })
      }
    },
    async clearToolHistory() {
      try {
        await ClearToolHistory()
        this.toolHistory = []
        this.recentTools = []
        this.showToast({ message: '输入历史已清空', type: 'success' })
      } catch {
        this.showToast({ message: '清空操作历史失败', type: 'error' })
      }
    },
    openToolOrder() {
      this.draftToolOrder = this.tools.map((tool) => tool.key)
      this.showToolOrder = true
    },
    moveDraftTool(index, offset) {
      const targetIndex = index + offset
      if (targetIndex < 0 || targetIndex >= this.draftToolOrder.length) return

      const nextOrder = [...this.draftToolOrder]
      const [toolKey] = nextOrder.splice(index, 1)
      nextOrder.splice(targetIndex, 0, toolKey)
      this.draftToolOrder = nextOrder
    },
    resetToolOrderDraft() {
      this.draftToolOrder = defaultTools.map((tool) => tool.key)
    },
    async saveToolOrder() {
      const normalizedOrder = normalizeToolOrder(defaultTools, this.draftToolOrder)
      try {
        await SaveToolOrder(normalizedOrder)
        this.tools = applySavedToolOrder(defaultTools, normalizedOrder)
        this.updateRecentTools()
        this.showToolOrder = false
        this.showToast({ message: '工具排序已保存', type: 'success' })
      } catch {
        this.showToast({ message: '保存工具排序失败', type: 'error' })
      }
    },
    async saveConfig(config) {
      const normalizedConfig = {
        ...config,
        environment: trimValue(config.environment),
        key: trimValue(config.key),
      }
      if (!normalizedConfig.environment) {
        this.showToast({ message: '请输入环境标识', type: 'error' })
        return
      }
      if (normalizedConfig.key !== '' && getUtf8ByteLength(normalizedConfig.key) !== 16) {
        this.showToast({ message: '密钥长度必须为16字节', type: 'error' })
        return
      }

      try {
        await SaveConfig(normalizedConfig)
        this.showToast({ message: '配置保存成功', type: 'success' })
        await this.loadConfigs()
      } catch {
        this.showToast({ message: '保存配置失败', type: 'error' })
      }
    },
    async saveH5Config(config) {
      const normalizedConfig = {
        ...config,
        environment: trimValue(config.environment),
        request_aes_256_cbc_iv: trimValue(config.request_aes_256_cbc_iv),
        request_aes_256_cbc_key: trimValue(config.request_aes_256_cbc_key),
        server_rsa_private_key: trimValue(config.server_rsa_private_key),
        response_aes_256_cbc_iv: trimValue(config.response_aes_256_cbc_iv),
        response_aes_256_cbc_key: trimValue(config.response_aes_256_cbc_key),
        client_rsa_private_key: trimValue(config.client_rsa_private_key),
      }
      if (!normalizedConfig.environment) {
        this.showToast({ message: '请输入 H5 环境标识', type: 'error' })
        return
      }
      const byteLengthError = getFirstByteLengthError(normalizedConfig, h5ConfigByteLengthRules)
      if (byteLengthError) {
        this.showToast({ message: byteLengthError, type: 'error' })
        return
      }

      try {
        await SaveH5DecryptConfig(normalizedConfig)
        this.showToast({ message: 'H5 配置保存成功', type: 'success' })
        await this.loadH5Config()
      } catch (error) {
        this.showToast({ message: error?.message || '保存 H5 配置失败', type: 'error' })
      }
    },
    async checkUpdateSilently() {
      try {
        const info = await CheckForUpdate()
        this.handleUpdateChecked(info)
      } catch {
        this.updateInfo = null
        this.updateAvailable = false
      }
    },
    handleUpdateChecked(info) {
      this.updateInfo = info
      this.updateAvailable = Boolean(info?.success && info.hasUpdate && info.platformHasAsset)
    },
    showToast(payload) {
      const toast = typeof payload === 'string' ? { message: payload, type: 'success' } : payload
      ElMessage({
        message: toast.message,
        type: toast.type || 'success',
        duration: 3000,
      })
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    startSidebarResize(event) {
      if (this.sidebarCollapsed) return
      event.preventDefault()
      this.resizingSidebar = true
      document.body.classList.add('is-resizing-sidebar')
      document.addEventListener('mousemove', this.resizeSidebar)
      document.addEventListener('mouseup', this.stopSidebarResize)
    },
    resizeSidebar(event) {
      if (!this.resizingSidebar) return
      this.sidebarWidth = Math.min(Math.max(event.clientX - 16, 220), 420)
    },
    stopSidebarResize() {
      if (!this.resizingSidebar) return
      this.resizingSidebar = false
      document.body.classList.remove('is-resizing-sidebar')
      document.removeEventListener('mousemove', this.resizeSidebar)
      document.removeEventListener('mouseup', this.stopSidebarResize)
    },
  },
}
</script>
