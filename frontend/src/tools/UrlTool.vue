<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>URL</h2>
          <p>URL encode/decode，并提示 malformed URI。</p>
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

export default {
  name: 'UrlTool',
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
    runEncode() {
      this.applyResult(encodeUrl(this.input))
    },
    runDecode() {
      this.applyResult(decodeUrl(this.input))
    },
    async copyOutput() {
      try {
        await navigator.clipboard.writeText(this.output)
        this.$emit('toast', { message: '已复制 URL 输出', type: 'success' })
      } catch {
        this.$emit('toast', { message: '复制失败', type: 'error' })
      }
    },
  },
}
</script>
