<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>URL</h2>
          <p>URL encode/decode，并提示 malformed URI。</p>
        </div>
        <div class="tool-header-actions">
          <el-button @click="$emit('open-history', 'url')">历史</el-button>
        </div>
      </div>
    </template>

    <el-input v-model="input" type="textarea" :rows="8" placeholder="请输入 URL 文本" />
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
import { decodeUrl, encodeUrl } from '../utils/devTools'
import { applyToolResult, copyToolOutput, summarizeText } from './toolUi'

export default {
  name: 'UrlTool',
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
      if (newValue?.toolKey !== 'url' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    applyResult(result, action) {
      applyToolResult(this, result, {
        toolKey: 'url',
        action,
        inputSnapshot: { input: this.input },
        inputSummary: summarizeText(this.input),
      })
    },
    runEncode() {
      this.applyResult(encodeUrl(this.input), 'Encode')
    },
    runDecode() {
      this.applyResult(decodeUrl(this.input), 'Decode')
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'URL 输出')
    }
  },
}
</script>
