<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>URL 参数</h2>
          <p>解析完整 URL 或 query，并保留重复参数。</p>
        </div>
      </div>
    </template>

    <el-form label-position="top">
      <el-form-item label="URL / Query">
        <el-input v-model="input" type="textarea" :rows="5" placeholder="https://example.com?a=1&a=中文#top 或 ?a=1" />
      </el-form-item>
    </el-form>

    <div class="action-row">
      <el-button type="primary" @click="runParse">解析</el-button>
      <el-button @click="addRow">添加参数</el-button>
      <el-checkbox v-model="sortKeys">按 key 排序</el-checkbox>
      <el-button @click="runBuild">构建 Query</el-button>
      <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-form-item label="Base URL">
          <el-input v-model="baseUrl" placeholder="https://example.com/path" clearable />
        </el-form-item>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-form-item label="Hash">
          <el-input v-model="hash" placeholder="#top" clearable />
        </el-form-item>
      </el-col>
    </el-row>

    <div class="query-row-list">
      <div v-for="(row, index) in rows" :key="index" class="query-row-item">
        <el-input v-model="row.key" placeholder="key" />
        <el-input v-model="row.value" placeholder="value" />
        <el-button @click="removeRow(index)">删除</el-button>
      </div>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import { buildUrlQuery, parseUrlQuery } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'QueryTool',
  emits: ['toast'],
  data() {
    return {
      input: '',
      baseUrl: '',
      hash: '',
      rows: [{ key: '', value: '' }],
      sortKeys: false,
      output: '',
      error: '',
    }
  },
  methods: {
    runParse() {
      const result = parseUrlQuery(this.input)
      if (result.ok) {
        this.baseUrl = result.value.baseUrl
        this.hash = result.value.hash
        this.rows = result.value.rows.length ? result.value.rows : [{ key: '', value: '' }]
      }
      applyToolResult(this, result, { format: (value) => JSON.stringify(value, null, 2) })
    },
    runBuild() {
      applyToolResult(this, buildUrlQuery(this.rows, { baseUrl: this.baseUrl, hash: this.hash, sort: this.sortKeys }))
    },
    addRow() {
      this.rows.push({ key: '', value: '' })
    },
    removeRow(index) {
      this.rows.splice(index, 1)
      if (this.rows.length === 0) this.addRow()
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'URL 参数输出')
    },
  },
}
</script>
