<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="解析完整 URL 或 query，并保留重复参数。">
        <template #actions>
          <el-button type="primary" @click="runParse">解析</el-button>
          <el-button @click="addRow">添加参数</el-button>
          <el-button @click="runBuild">构建 Query</el-button>
        </template>

        <el-form label-position="top" class="tool-section">
          <el-form-item label="URL / Query">
            <el-input v-model="input" type="textarea" :rows="5" placeholder="https://example.com?a=1&a=中文#top 或 ?a=1" />
          </el-form-item>
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
          <el-checkbox v-model="sortKeys">按 key 排序</el-checkbox>
        </el-form>

        <div class="query-row-list">
          <div v-for="(row, index) in rows" :key="index" class="query-row-item">
            <el-input v-model="row.key" placeholder="key" />
            <el-input v-model="row.value" placeholder="value" />
            <el-button @click="removeRow(index)">删除</el-button>
          </div>
        </div>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="输出" :description="output ? '解析或构建后的 URL 参数数据。' : '输出会显示在这里。'">
        <template #actions>
          <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
        </template>

        <el-alert v-if="error" :title="error" type="error" show-icon />
        <pre v-else-if="output" class="result-json">{{ output }}</pre>
        <div v-else class="tool-empty-result">暂无输出</div>
      </ToolPanel>
    </template>
  </ToolWorkspace>
</template>

<script>
import ToolPanel from '../components/ToolPanel.vue'
import ToolWorkspace from '../components/ToolWorkspace.vue'
import { buildUrlQuery, parseUrlQuery } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'QueryTool',
  components: {
    ToolPanel,
    ToolWorkspace,
  },
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
      baseUrl: '',
      hash: '',
      rows: [{ key: '', value: '' }],
      sortKeys: false,
      output: '',
      error: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'query' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.baseUrl = snapshot.baseUrl || ''
      this.hash = snapshot.hash || ''
      this.rows = Array.isArray(snapshot.rows) && snapshot.rows.length ? snapshot.rows : [{ key: '', value: '' }]
      this.sortKeys = Boolean(snapshot.sortKeys)
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    inputSnapshot() {
      return {
        input: this.input,
        baseUrl: this.baseUrl,
        hash: this.hash,
        rows: this.rows,
        sortKeys: this.sortKeys,
      }
    },
    runParse() {
      const snapshot = this.inputSnapshot()
      const result = parseUrlQuery(this.input)
      if (result.ok) {
        this.baseUrl = result.value.baseUrl
        this.hash = result.value.hash
        this.rows = result.value.rows.length ? result.value.rows : [{ key: '', value: '' }]
      }
      applyToolResult(this, result, {
        format: (value) => JSON.stringify(value, null, 2),
        toolKey: 'query',
        action: '解析参数',
        inputSnapshot: snapshot,
        inputSummary: `parse · ${this.input.length} chars`,
      })
    },
    runBuild() {
      applyToolResult(this, buildUrlQuery(this.rows, { baseUrl: this.baseUrl, hash: this.hash, sort: this.sortKeys }), {
        toolKey: 'query',
        action: '构建参数',
        inputSnapshot: this.inputSnapshot(),
        inputSummary: `build · ${this.rows.length} rows`,
      })
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
