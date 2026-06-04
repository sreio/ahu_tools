<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="选择 H5 环境并粘贴请求或响应 payload。">
        <template #actions>
          <el-button type="primary" :loading="loading" :disabled="!isFormValid" @click="handleDecrypt">
            {{ decryptButtonText }}
          </el-button>
        </template>

        <el-tabs v-model="mode" class="tool-tabs" @tab-change="clearResult">
          <el-tab-pane label="请求解密" name="request">
            <el-alert
              title="请求解密使用 SERVER_RSA_PRIVATE_KEY 解密 secretKey，并使用请求 AES 配置处理 raw encryptData。"
              type="info"
              show-icon
              :closable="false"
              class="tool-feedback"
            />
          </el-tab-pane>
          <el-tab-pane label="响应解密" name="response">
            <el-alert
              title="响应解密使用 CLIENT_RSA_PRIVATE_KEY 解密 secretKey，并使用响应 AES 配置处理 raw encryptData。"
              type="info"
              show-icon
              :closable="false"
              class="tool-feedback"
            />
          </el-tab-pane>
        </el-tabs>

        <el-form label-position="top" class="tool-section" @submit.prevent="handleDecrypt">
          <el-form-item label="环境选择">
            <el-select v-model="environment" placeholder="请选择 H5 环境" class="full-width">
              <el-option
                v-for="config in h5Configs"
                :key="config.environment"
                :label="config.description || config.environment"
                :value="config.environment"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="inputLabel" class="tool-fill-input">
            <el-input
              v-model="input"
              type="textarea"
              :placeholder="inputPlaceholder"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <span>{{ input.trim().length }} 字符</span>
          <el-button text :disabled="!input" @click="input = ''">清空输入</el-button>
        </template>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="结果" :description="result ? resultModeLabel : '执行解密后结果会显示在这里。'">
        <template #actions>
          <el-button :disabled="!result" @click="copyResult">复制结果</el-button>
          <el-button :disabled="!result && !error" @click="clearResult">清空结果</el-button>
        </template>

        <el-alert v-if="error" :title="error" type="error" show-icon />
        <el-tabs v-else-if="result" v-model="activeTab">
          <el-tab-pane label="JSON格式" name="json">
            <pre class="result-json">{{ formattedJson }}</pre>
          </el-tab-pane>
          <el-tab-pane label="原始数据" name="raw">
            <pre class="result-json">{{ result.raw }}</pre>
          </el-tab-pane>
        </el-tabs>
        <div v-else class="tool-empty-result">暂无结果</div>
      </ToolPanel>
    </template>
  </ToolWorkspace>
</template>

<script>
import ToolPanel from '../components/ToolPanel.vue'
import ToolWorkspace from '../components/ToolWorkspace.vue'
import { H5Decrypt } from '../services/wailsApi'
import { copyToolOutput, emitToolAction, summarizeText } from './toolUi'

export default {
  name: 'H5DecryptTool',
  components: {
    ToolPanel,
    ToolWorkspace,
  },
  props: {
    h5Configs: {
      type: Array,
      default: () => [],
    },
    historyRestore: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'open-h5-settings', 'tool-action', 'open-history'],
  data() {
    return {
      environment: '',
      mode: 'request',
      input: '',
      loading: false,
      result: null,
      error: null,
      activeTab: 'json',
    }
  },
  computed: {
    isFormValid() {
      return this.environment && this.input.trim()
    },
    modeLabel() {
      return this.mode === 'response' ? '响应解密' : '请求解密'
    },
    inputLabel() {
      return `${this.modeLabel}数据`
    },
    inputPlaceholder() {
      return this.mode === 'response'
        ? '请输入服务端响应 payload JSON，或直接输入响应 encryptData，例如 {"secretKey":"...","encryptData":"..."}'
        : '请输入客户端请求 payload JSON，或直接输入请求 encryptData，例如 {"secretKey":"...","encryptData":"..."}'
    },
    decryptButtonText() {
      return this.mode === 'response' ? '解密响应数据' : '解密请求数据'
    },
    formattedJson() {
      if (!this.result) return ''
      if (this.result.isJson) {
        return JSON.stringify(this.result.data, null, 2)
      }
      return this.result.raw
    },
    resultModeLabel() {
      if (!this.result?.mode) return this.modeLabel
      const [mode, payloadMode] = this.result.mode.split('-')
      const modeText = mode === 'response' ? '响应解密' : '请求解密'
      const payloadText = payloadMode === 'payload' ? 'Payload' : 'Raw'
      return `${modeText} · ${payloadText}`
    },
  },
  watch: {
    h5Configs: {
      immediate: true,
      handler(configs) {
        if (!this.environment && configs.length > 0) {
          this.environment = configs[0].environment
        }
      },
    },
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'h5-decrypt' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.environment = snapshot.environment || this.environment
      this.mode = snapshot.mode === 'response' ? 'response' : 'request'
      this.input = snapshot.input || ''
      this.result = null
      this.error = null
      this.activeTab = 'json'
    },
  },
  methods: {
    emitDecryptAction(success) {
      emitToolAction(this, {
        toolKey: 'h5-decrypt',
        action: this.modeLabel,
        success,
        inputSnapshot: { environment: this.environment, mode: this.mode, input: this.input },
        inputSummary: `${this.environment || '未选择环境'} · ${this.modeLabel} · ${summarizeText(this.input)}`,
      })
    },
    async handleDecrypt() {
      this.loading = true
      this.result = null
      this.error = null

      try {
        const response = await H5Decrypt({ environment: this.environment, mode: this.mode, data: this.input })
        if (response.success) {
          this.result = response
          this.activeTab = 'json'
          this.$emit('toast', { message: `${this.modeLabel}成功`, type: 'success' })
        } else {
          this.error = response.error || `${this.modeLabel}失败`
        }
        this.emitDecryptAction(response.success)
      } catch {
        this.error = `调用 H5 ${this.modeLabel}服务失败，请稍后重试`
        this.emitDecryptAction(false)
      } finally {
        this.loading = false
      }
    },
    async copyResult() {
      const text = this.activeTab === 'json' ? this.formattedJson : this.result.raw
      const label = this.activeTab === 'json' ? `H5 ${this.modeLabel} JSON 结果` : `H5 ${this.modeLabel}原始结果`
      await copyToolOutput(this, text, label)
    },
    clearResult() {
      this.result = null
      this.error = null
    },
  },
}
</script>
