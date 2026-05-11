<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>正则测试</h2>
          <p>使用 JavaScript RegExp 测试文本匹配结果。</p>
        </div>
      </div>
    </template>

    <el-form label-position="top">
      <el-form-item label="Pattern">
        <el-input v-model="pattern" placeholder="例如 (?<word>\\w+)" clearable />
      </el-form-item>
      <el-form-item label="Flags（d/g/i/m/s/u/v/y）">
        <el-input v-model="flags" placeholder="例如 gim" clearable />
      </el-form-item>
      <el-form-item label="测试文本">
        <el-input v-model="text" type="textarea" :rows="8" placeholder="请输入待匹配文本" />
      </el-form-item>
    </el-form>

    <div class="action-row">
      <el-button type="primary" @click="runTest">测试</el-button>
      <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import { testRegex } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'RegexTool',
  emits: ['toast'],
  data() {
    return {
      pattern: '',
      flags: 'g',
      text: '',
      output: '',
      error: '',
    }
  },
  methods: {
    runTest() {
      applyToolResult(this, testRegex({ pattern: this.pattern, flags: this.flags, text: this.text }), {
        format: (value) => JSON.stringify(value, null, 2),
      })
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, '正则测试输出')
    },
  },
}
</script>
