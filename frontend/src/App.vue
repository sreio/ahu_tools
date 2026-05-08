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
        @select-tool="activeTool = $event"
        @toggle-collapse="toggleSidebar"
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
  </el-container>
</template>

<script>
import { ElMessage } from 'element-plus'
import ConfigModal from './components/ConfigModal.vue'
import SidebarNav from './components/SidebarNav.vue'
import { GetAllConfigs, GetAppName, GetAuthor, GetVersion, SaveConfig } from './services/wailsApi'
import { tools } from './tools'

export default {
  name: 'App',
  components: {
    ConfigModal,
    SidebarNav,
  },
  data() {
    return {
      tools,
      activeTool: 'decrypt',
      appName: 'AhuTools',
      version: '1.0.0',
      author: 'sreio',
      configs: [],
      showSettings: false,
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
  },
  async mounted() {
    await this.loadAppInfo()
    await this.loadConfigs()
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
