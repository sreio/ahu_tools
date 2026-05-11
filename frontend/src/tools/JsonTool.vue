<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>JSON</h2>
          <p>格式化、压缩、Unicode 转换和反斜杠转义处理。</p>
        </div>
      </div>
    </template>

    <el-input v-model="input" type="textarea" :rows="10" placeholder="请输入 JSON" />
    <div class="action-row">
      <el-button type="primary" @click="runFormat">格式化</el-button>
      <el-button @click="runMinify">压缩</el-button>
      <el-button @click="runEncodeUnicode">中文转 Unicode</el-button>
      <el-button @click="runDecodeUnicode">Unicode 转中文</el-button>
      <el-button @click="runAddSlashes">添加反斜杠</el-button>
      <el-button @click="runRemoveSlashes">去除反斜杠</el-button>
      <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import {
  addJsonSlashes,
  decodeChineseUnicode,
  encodeChineseUnicode,
  formatJson,
  minifyJson,
  removeJsonSlashes,
} from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

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
      applyToolResult(this, result)
    },
    runFormat() {
      this.applyResult(formatJson(this.input))
    },
    runMinify() {
      this.applyResult(minifyJson(this.input))
    },
    runEncodeUnicode() {
      this.applyResult(encodeChineseUnicode(this.input))
    },
    runDecodeUnicode() {
      this.applyResult(decodeChineseUnicode(this.input))
    },
    runAddSlashes() {
      this.applyResult(addJsonSlashes(this.input))
    },
    runRemoveSlashes() {
      this.applyResult(removeJsonSlashes(this.input))
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'JSON 输出')
    }
  },
}
</script>
