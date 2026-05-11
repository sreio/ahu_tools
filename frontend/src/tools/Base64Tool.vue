<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>Base64</h2>
          <p>UTF-8 文本 Base64 encode/decode。</p>
        </div>
        <div class="tool-header-actions">
          <el-button @click="$emit('open-history', 'base64')">历史</el-button>
        </div>
      </div>
    </template>

    <el-input v-model="input" type="textarea" :rows="8" placeholder="请输入文本或 Base64" />
    <div class="action-row">
      <el-button type="primary" @click="runEncode">Encode</el-button>
      <el-button @click="runDecode">Decode</el-button>
      <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import { decodeBase64, encodeBase64 } from '../utils/devTools'
import { applyToolResult, copyToolOutput, summarizeText } from './toolUi'

export default {
  name: 'Base64Tool',
  props: {
    historyRestore: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'tool-action', 'open-history'],
  data() {
    return {
      input: '',
      output: '',
      error: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'base64' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    applyResult(result, action) {
      applyToolResult(this, result, {
        toolKey: 'base64',
        action,
        inputSnapshot: { input: this.input },
        inputSummary: summarizeText(this.input),
      })
    },
    runEncode() {
      this.applyResult(encodeBase64(this.input), 'Encode')
    },
    runDecode() {
      this.applyResult(decodeBase64(this.input), 'Decode')
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'Base64 输出')
    }
  },
}
</script>
