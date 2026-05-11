<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>HTML 实体</h2>
          <p>转换 HTML named entity 与数字实体。</p>
        </div>
        <div class="tool-header-actions">
          <el-button @click="$emit('open-history', 'html-entity')">历史</el-button>
        </div>
      </div>
    </template>

    <el-input v-model="input" type="textarea" :rows="8" placeholder="请输入需要编码或解码的文本" />
    <div class="action-row">
      <el-button type="primary" @click="runEncode">实体编码</el-button>
      <el-button @click="runDecode">实体解码</el-button>
      <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import { decodeHtmlEntities, encodeHtmlEntities } from '../utils/devTools'
import { applyToolResult, copyToolOutput, summarizeText } from './toolUi'

export default {
  name: 'HtmlEntityTool',
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
      if (newValue?.toolKey !== 'html-entity' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    runEncode() {
      applyToolResult(this, encodeHtmlEntities(this.input), {
        toolKey: 'html-entity',
        action: '实体编码',
        inputSnapshot: { input: this.input },
        inputSummary: summarizeText(this.input),
      })
    },
    runDecode() {
      applyToolResult(this, decodeHtmlEntities(this.input), {
        toolKey: 'html-entity',
        action: '实体解码',
        inputSnapshot: { input: this.input },
        inputSummary: summarizeText(this.input),
      })
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'HTML 实体输出')
    },
  },
}
</script>
