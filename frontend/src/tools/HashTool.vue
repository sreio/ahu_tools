<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>Hash</h2>
          <p>计算常用 SHA hash。</p>
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

export default {
  name: 'HashTool',
  emits: ['toast'],
  data() {
    return {
      algorithm: 'SHA-256',
      input: '',
      output: '',
      error: '',
    }
  },
  methods: {
    async runHash() {
      const result = await hashText(this.input, this.algorithm)
      if (result.ok) {
        this.output = result.value
        this.error = ''
      } else {
        this.output = ''
        this.error = result.error
      }
    },
    async copyOutput() {
      try {
        await navigator.clipboard.writeText(this.output)
        this.$emit('toast', { message: '已复制 Hash 输出', type: 'success' })
      } catch {
        this.$emit('toast', { message: '复制失败', type: 'error' })
      }
    },
  },
}
</script>
