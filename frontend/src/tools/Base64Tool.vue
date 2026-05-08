<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>Base64</h2>
          <p>UTF-8 文本 Base64 encode/decode。</p>
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

export default {
  name: 'Base64Tool',
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
      this.applyResult(encodeBase64(this.input))
    },
    runDecode() {
      this.applyResult(decodeBase64(this.input))
    },
    async copyOutput() {
      try {
        await navigator.clipboard.writeText(this.output)
        this.$emit('toast', { message: '已复制 Base64 输出', type: 'success' })
      } catch {
        this.$emit('toast', { message: '复制失败', type: 'error' })
      }
    },
  },
}
</script>
