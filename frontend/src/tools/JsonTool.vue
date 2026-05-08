<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>JSON</h2>
          <p>格式化、压缩 JSON，并展示解析错误。</p>
        </div>
      </div>
    </template>

    <el-input v-model="input" type="textarea" :rows="10" placeholder="请输入 JSON" />
    <div class="action-row">
      <el-button type="primary" @click="runFormat">格式化</el-button>
      <el-button @click="runMinify">压缩</el-button>
      <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import { formatJson, minifyJson } from '../utils/devTools'

export default {
  name: 'JsonTool',
  emits: ['toast'],
  data() {
    return {
      input: '',
      output: '',
      error: '',
    }
  },
  methods: {
    applyResult(result) {
      if (result.ok) {
        this.output = result.value
        this.error = ''
      } else {
        this.output = ''
        this.error = result.error
      }
    },
    runFormat() {
      this.applyResult(formatJson(this.input))
    },
    runMinify() {
      this.applyResult(minifyJson(this.input))
    },
    async copyOutput() {
      try {
        await navigator.clipboard.writeText(this.output)
        this.$emit('toast', { message: '已复制 JSON 输出', type: 'success' })
      } catch {
        this.$emit('toast', { message: '复制失败', type: 'error' })
      }
    },
  },
}
</script>
