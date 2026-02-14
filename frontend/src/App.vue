<template>
  <div class="container">
    <header>
      <h1>{{ appName }}</h1>
      <p>选择环境并输入加密数据进行解密</p>
      <div class="version-info">
        <span>版本: {{ version }}</span>
        <span>作者: {{ author }}</span>
        <button @click="showSettings = true" class="settings-btn">⚙️ 配置</button>
      </div>
    </header>

    <main>
      <form @submit.prevent="handleDecrypt" class="decrypt-form">
        <div class="form-group">
          <label for="environment">环境选择：</label>
          <select v-model="environment" id="environment" required>
            <option value="">请选择环境</option>
            <option v-for="config in configs" :key="config.environment" :value="config.environment">
              {{ config.description }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="encryptedData">加密数据：</label>
          <textarea
            v-model="encryptedData"
            id="encryptedData"
            rows="8"
            placeholder="请输入要解密的加密数据..."
            required
          ></textarea>
        </div>

        <button type="submit" class="decrypt-btn" :disabled="loading || !isFormValid">
          <span v-if="!loading">解密数据</span>
          <span v-else>解密中...</span>
        </button>
      </form>

      <div v-if="result" class="result-section">
        <h2>解密结果</h2>
        <div class="result-tabs">
          <button
            :class="['tab-btn', { active: activeTab === 'json' }]"
            @click="activeTab = 'json'"
          >
            JSON格式
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'raw' }]"
            @click="activeTab = 'raw'"
          >
            原始数据
          </button>
        </div>

        <div class="tab-content">
          <div v-show="activeTab === 'json'" class="tab-pane">
            <div class="result-container">
              <pre class="result-json">{{ formattedJson }}</pre>
            </div>
          </div>

          <div v-show="activeTab === 'raw'" class="tab-pane">
            <div class="result-container">
              <pre class="result-raw">{{ result.raw }}</pre>
            </div>
          </div>
        </div>

        <div class="result-actions">
          <button @click="copyResult" class="copy-btn">复制结果</button>
          <button @click="clearResult" class="clear-btn">清空结果</button>
        </div>
      </div>

      <div v-if="error" class="error-section">
        <h2>错误信息</h2>
        <div class="error-container">
          <pre class="error-message">{{ error }}</pre>
        </div>
      </div>
    </main>

    <footer>
      <p>© 2024 {{ appName }} | 请确保在安全的环境中使用</p>
    </footer>

    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>环境配置</h2>
          <button @click="showSettings = false" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div v-for="config in configs" :key="config.environment" class="config-item">
            <h3>{{ config.description }}</h3>
            <div class="form-group">
              <label>环境标识：</label>
              <input type="text" :value="config.environment" disabled />
            </div>
            <div class="form-group">
              <label>密钥（16字节）：</label>
              <input
                type="text"
                v-model="config.key"
                placeholder="请输入16字节密钥"
                maxlength="16"
              />
              <small>当前长度: {{ config.key.length }}/16</small>
            </div>
            <div class="form-group">
              <label>描述：</label>
              <input type="text" v-model="config.description" />
            </div>
            <button @click="saveConfig(config)" class="save-btn">保存配置</button>
          </div>
          <div class="add-config">
            <h3>添加新环境</h3>
            <div class="form-group">
              <label>环境标识：</label>
              <input type="text" v-model="newConfig.environment" placeholder="例如: staging" />
            </div>
            <div class="form-group">
              <label>密钥（16字节）：</label>
              <input
                type="text"
                v-model="newConfig.key"
                placeholder="请输入16字节密钥"
                maxlength="16"
              />
              <small>当前长度: {{ newConfig.key.length }}/16</small>
            </div>
            <div class="form-group">
              <label>描述：</label>
              <input type="text" v-model="newConfig.description" placeholder="例如: 预发布环境" />
            </div>
            <button @click="addConfig" class="add-btn">添加环境</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="toast">{{ toast.message }}</div>
  </div>
</template>

<script>
import { Decrypt, GetAllConfigs, SaveConfig, GetVersion, GetAppName, GetAuthor } from '../wailsjs/go/main/App'

export default {
  name: 'App',
  data() {
    return {
      appName: 'AhuTools',
      version: '1.0.0',
      author: 'sreio',
      environment: '',
      encryptedData: '',
      loading: false,
      result: null,
      error: null,
      activeTab: 'json',
      showSettings: false,
      configs: [],
      newConfig: {
        environment: '',
        key: '',
        description: ''
      },
      toast: {
        show: false,
        message: ''
      }
    }
  },
  computed: {
    isFormValid() {
      return this.environment && this.encryptedData.trim()
    },
    formattedJson() {
      if (!this.result) return ''
      if (this.result.isJson) {
        return JSON.stringify(this.result.data, null, 2)
      }
      return this.result.raw
    }
  },
  async mounted() {
    await this.loadAppInfo()
    await this.loadConfigs()
  },
  methods: {
    async loadAppInfo() {
      try {
        this.appName = await GetAppName()
        this.version = await GetVersion()
        this.author = await GetAuthor()
      } catch (err) {
        console.error('Failed to load app info:', err)
      }
    },
    async loadConfigs() {
      try {
        this.configs = await GetAllConfigs()
      } catch (err) {
        this.showToast('加载配置失败: ' + err)
      }
    },
    async handleDecrypt() {
      this.loading = true
      this.result = null
      this.error = null

      try {
        const response = await Decrypt({
          environment: this.environment,
          data: this.encryptedData
        })

        if (response.success) {
          this.result = response
          this.activeTab = 'json'
        } else {
          this.error = response.error || '解密失败'
        }
      } catch (err) {
        this.error = '请求失败: ' + err
      } finally {
        this.loading = false
      }
    },
    async saveConfig(config) {
      if (config.key.length !== 16 && config.key !== '') {
        this.showToast('密钥长度必须为16字节')
        return
      }

      try {
        await SaveConfig(config)
        this.showToast('配置保存成功')
        await this.loadConfigs()
      } catch (err) {
        this.showToast('保存失败: ' + err)
      }
    },
    async addConfig() {
      if (!this.newConfig.environment) {
        this.showToast('请输入环境标识')
        return
      }
      if (this.newConfig.key.length !== 16) {
        this.showToast('密钥长度必须为16字节')
        return
      }

      try {
        await SaveConfig(this.newConfig)
        this.showToast('环境添加成功')
        this.newConfig = { environment: '', key: '', description: '' }
        await this.loadConfigs()
      } catch (err) {
        this.showToast('添加失败: ' + err)
      }
    },
    copyResult() {
      const text = this.activeTab === 'json' ? this.formattedJson : this.result.raw
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('结果已复制到剪贴板')
      }).catch(() => {
        this.showToast('复制失败')
      })
    },
    clearResult() {
      this.result = null
      this.error = null
      this.encryptedData = ''
    },
    showToast(message) {
      this.toast.message = message
      this.toast.show = true
      setTimeout(() => {
        this.toast.show = false
      }, 3000)
    }
  }
}
</script>
