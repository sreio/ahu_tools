<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>数据解密</h2>
          <p>选择环境并输入加密数据进行 AES-CBC 解密。</p>
        </div>
        <el-button type="primary" @click="$emit('open-settings')">环境配置</el-button>
      </div>
    </template>

    <el-form label-position="top" @submit.prevent="handleDecrypt">
      <el-form-item label="环境选择">
        <el-select v-model="environment" placeholder="请选择环境" class="full-width">
          <el-option
            v-for="config in configs"
            :key="config.environment"
            :label="config.description || config.environment"
            :value="config.environment"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="加密数据">
        <el-input
          v-model="encryptedData"
          type="textarea"
          :rows="8"
          placeholder="请输入要解密的加密数据..."
        />
      </el-form-item>

      <el-button type="primary" native-type="submit" :loading="loading" :disabled="!isFormValid">
        解密数据
      </el-button>
    </el-form>

    <el-card v-if="result" class="result-container" shadow="never">
      <template #header>解密结果</template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="JSON格式" name="json">
          <pre class="result-json">{{ formattedJson }}</pre>
        </el-tab-pane>
        <el-tab-pane label="原始数据" name="raw">
          <pre class="result-json">{{ result.raw }}</pre>
        </el-tab-pane>
      </el-tabs>
      <div class="result-actions">
        <el-button type="success" @click="copyResult">复制结果</el-button>
        <el-button type="danger" @click="clearResult">清空结果</el-button>
      </div>
    </el-card>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
  </el-card>
</template>

<script>
import { Decrypt } from '../services/wailsApi'

export default {
  name: 'DecryptTool',
  props: {
    configs: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['toast', 'open-settings'],
  data() {
    return {
      environment: '',
      encryptedData: '',
      loading: false,
      result: null,
      error: null,
      activeTab: 'json',
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
    },
  },
  watch: {
    configs: {
      immediate: true,
      handler(configs) {
        if (!this.environment && configs.length > 0) {
          this.environment = configs[0].environment
        }
      },
    },
  },
  methods: {
    async handleDecrypt() {
      this.loading = true
      this.result = null
      this.error = null

      try {
        const response = await Decrypt({
          environment: this.environment,
          data: this.encryptedData,
        })

        if (response.success) {
          this.result = response
          this.activeTab = 'json'
          this.$emit('toast', { message: '解密成功', type: 'success' })
        } else {
          this.error = response.error || '解密失败'
        }
      } catch {
        this.error = '调用解密服务失败，请稍后重试'
      } finally {
        this.loading = false
      }
    },
    async copyResult() {
      const text = this.activeTab === 'json' ? this.formattedJson : this.result.raw
      try {
        await navigator.clipboard.writeText(text)
        this.$emit('toast', { message: '结果已复制到剪贴板', type: 'success' })
      } catch {
        this.$emit('toast', { message: '复制失败', type: 'error' })
      }
    },
    clearResult() {
      this.result = null
      this.error = null
      this.encryptedData = ''
    },
  },
}
</script>
