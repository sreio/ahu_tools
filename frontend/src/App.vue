<template>
  <el-container class="app-shell">
    <el-aside :width="sidebarWidthStyle" class="app-aside" :class="{ 'is-collapsed': sidebarCollapsed }">
      <SidebarNav
        :app-name="appName"
        :version="version"
        :author="author"
        :tools="tools"
        :active-tool="activeTool"
        :collapsed="sidebarCollapsed"
        :update-available="updateAvailable"
        @select-tool="activeTool = $event"
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
        @toast="showToast"
        @open-settings="showSettings = true"
      />
    </el-main>

    <ConfigModal
      v-model="showSettings"
      :configs="configs"
      @save="saveConfig"
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
  </el-container>
</template>

<script>
import { ElMessage } from 'element-plus'
import ConfigModal from './components/ConfigModal.vue'
import SidebarNav from './components/SidebarNav.vue'
import {
  CheckForUpdate,
  GetAllConfigs,
  GetAppName,
  GetAuthor,
  GetToolOrder,
  GetVersion,
  SaveConfig,
  SaveToolOrder,
} from './services/wailsApi'
import { tools as defaultTools } from './tools'
import { applySavedToolOrder, normalizeToolOrder } from './tools/order'
import UpdateTool from './tools/UpdateTool.vue'

export default {
  name: 'App',
  components: {
    ConfigModal,
    SidebarNav,
    UpdateTool,
  },
  data() {
    return {
      tools: [...defaultTools],
      activeTool: 'decrypt',
      appName: 'IT工具箱',
      version: '1.1.7',
      author: 'sreio',
      configs: [],
      showSettings: false,
      showUpdates: false,
      showToolOrder: false,
      draftToolOrder: [],
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
  },
  async mounted() {
    await this.loadAppInfo()
    await this.loadToolOrder()
    await this.loadConfigs()
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
    async loadToolOrder() {
      try {
        const savedOrder = await GetToolOrder()
        this.tools = applySavedToolOrder(defaultTools, savedOrder)
      } catch {
        this.tools = [...defaultTools]
        this.showToast({ message: '加载工具排序失败', type: 'error' })
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
        this.showToolOrder = false
        this.showToast({ message: '工具排序已保存', type: 'success' })
      } catch {
        this.showToast({ message: '保存工具排序失败', type: 'error' })
      }
    },
    async saveConfig(config) {
      if (!config.environment) {
        this.showToast({ message: '请输入环境标识', type: 'error' })
        return
      }
      if (config.key.length !== 16 && config.key !== '') {
        this.showToast({ message: '密钥长度必须为16字节', type: 'error' })
        return
      }

      try {
        await SaveConfig(config)
        this.showToast({ message: '配置保存成功', type: 'success' })
        await this.loadConfigs()
      } catch {
        this.showToast({ message: '保存配置失败', type: 'error' })
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
