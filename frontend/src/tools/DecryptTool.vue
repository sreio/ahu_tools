<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="选择环境并粘贴 AES-CBC 密文。">
        <template #actions>
          <el-button type="primary" :loading="loading" :disabled="!isFormValid" @click="handleDecrypt">
            解密数据
          </el-button>
        </template>

        <el-form label-position="top" class="tool-section" @submit.prevent="handleDecrypt">
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

          <el-form-item label="加密数据" class="tool-fill-input">
            <el-input
              v-model="encryptedData"
              type="textarea"
              placeholder="请输入要解密的加密数据..."
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <span>{{ encryptedData.trim().length }} 字符</span>
          <el-button text :disabled="!encryptedData" @click="encryptedData = ''">清空输入</el-button>
        </template>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="结果" :description="result ? '解密结果可切换 JSON 或原始数据。' : '执行解密后结果会显示在这里。'">
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
import { Decrypt } from '../services/wailsApi'
import { copyToolOutput, emitToolAction, summarizeText } from './toolUi'

export default {
  name: 'DecryptTool',
  components: {
    ToolPanel,
    ToolWorkspace,
  },
  props: {
    configs: {
      type: Array,
      default: () => [],
    },
    historyRestore: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'open-settings', 'tool-action', 'open-history'],
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
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'decrypt' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.environment = snapshot.environment || ''
      this.encryptedData = snapshot.encryptedData || ''
      this.result = null
      this.error = null
      this.activeTab = 'json'
    },
  },
  methods: {
    emitDecryptAction(success) {
      emitToolAction(this, {
        toolKey: 'decrypt',
        action: '解密',
        success,
        inputSnapshot: { environment: this.environment, encryptedData: this.encryptedData },
        inputSummary: `${this.environment || '未选择环境'} · ${summarizeText(this.encryptedData)}`,
      })
    },
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
        this.emitDecryptAction(response.success)
      } catch {
        this.error = '调用解密服务失败，请稍后重试'
        this.emitDecryptAction(false)
      } finally {
        this.loading = false
      }
    },
    async copyResult() {
      const text = this.activeTab === 'json' ? this.formattedJson : this.result.raw
      const label = this.activeTab === 'json' ? '解密 JSON 结果' : '解密原始结果'
      await copyToolOutput(this, text, label)
    },
    clearResult() {
      this.result = null
      this.error = null
      this.encryptedData = ''
    },
  },
}
</script>
