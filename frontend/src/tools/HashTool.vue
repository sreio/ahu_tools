<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>Hash</h2>
          <p>计算常用 SHA hash。</p>
        </div>
        <div class="tool-header-actions">
          <el-button @click="$emit('open-history', 'hash')">历史</el-button>
        </div>
      </div>
    </template>

    <el-form label-position="top">
      <el-form-item label="算法">
        <el-select v-model="algorithm" class="full-width">
          <el-option label="SHA-1" value="SHA-1" />
          <el-option label="SHA-256" value="SHA-256" />
          <el-option label="SHA-384" value="SHA-384" />
          <el-option label="SHA-512" value="SHA-512" />
        </el-select>
      </el-form-item>
      <el-form-item label="文本">
        <el-input v-model="input" type="textarea" :rows="8" placeholder="请输入要计算 hash 的文本" />
      </el-form-item>
    </el-form>

    <div class="action-row">
      <el-button type="primary" @click="runHash">计算</el-button>
      <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import { hashText } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'HashTool',
  props: {
    historyRestore: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'tool-action', 'open-history'],
  data() {
    return {
      algorithm: 'SHA-256',
      input: '',
      output: '',
      error: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'hash' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.algorithm = snapshot.algorithm || 'SHA-256'
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    async runHash() {
      const result = await hashText(this.input, this.algorithm)
      applyToolResult(this, result, {
        toolKey: 'hash',
        action: this.algorithm,
        inputSnapshot: { input: this.input, algorithm: this.algorithm },
        inputSummary: `${this.algorithm} · ${this.input.length} chars`,
      })
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'Hash 输出')
    }
  },
}
</script>
