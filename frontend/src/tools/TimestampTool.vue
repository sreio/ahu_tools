<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>时间戳转换</h2>
          <p>秒/毫秒 timestamp 与本地日期时间互转。</p>
        </div>
        <div class="tool-header-actions">
          <el-button @click="$emit('open-history', 'timestamp')">历史</el-button>
        </div>
      </div>
    </template>

    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <el-form label-position="top">
          <el-form-item label="Timestamp">
            <el-input v-model="timestampInput" placeholder="1704067200 或 1704067200000" clearable />
          </el-form-item>
          <div class="action-row">
            <el-button type="primary" @click="convertTimestamp">转为日期时间</el-button>
          </div>
        </el-form>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-form label-position="top">
          <el-form-item label="日期时间">
            <el-date-picker
              v-model="dateInput"
              type="datetime"
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择日期时间"
              class="full-width"
            />
          </el-form-item>
          <div class="action-row">
            <el-button type="primary" @click="convertDate">转为 timestamp</el-button>
            <el-button @click="useCurrentTime">当前时间</el-button>
          </div>
        </el-form>
      </el-col>
    </el-row>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
      <div class="result-actions">
        <el-button @click="copyOutput">复制输出</el-button>
      </div>
    </el-card>
  </el-card>
</template>

<script>
import { dateToTimestamp, timestampToDate } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'TimestampTool',
  props: {
    historyRestore: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'tool-action', 'open-history'],
  data() {
    return {
      timestampInput: '',
      dateInput: '',
      output: '',
      error: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'timestamp' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.timestampInput = snapshot.timestampInput || ''
      this.dateInput = snapshot.dateInput ? new Date(snapshot.dateInput) : ''
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    applyResult(result, action) {
      applyToolResult(this, result, {
        format: (value) => JSON.stringify(value, null, 2),
        toolKey: 'timestamp',
        action,
        inputSnapshot: { timestampInput: this.timestampInput, dateInput: this.dateInput },
        inputSummary: action === '时间戳转日期' ? `timestamp · ${this.timestampInput}` : 'date to timestamp',
      })
    },
    convertTimestamp() {
      this.applyResult(timestampToDate(this.timestampInput), '时间戳转日期')
    },
    convertDate() {
      this.applyResult(dateToTimestamp(this.dateInput), '日期转时间戳')
    },
    useCurrentTime() {
      this.dateInput = new Date()
      this.convertDate()
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, '时间戳输出')
    },
  },
}
</script>
