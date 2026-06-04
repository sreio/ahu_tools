<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="秒/毫秒 timestamp 与本地日期时间互转。">
        <template #actions>
          <el-button type="primary" @click="convertTimestamp">转为日期时间</el-button>
          <el-button @click="convertDate">转为 timestamp</el-button>
          <el-button @click="useCurrentTime">当前时间</el-button>
        </template>

        <el-form label-position="top" class="tool-section">
          <el-form-item label="Timestamp">
            <el-input v-model="timestampInput" placeholder="1704067200 或 1704067200000" clearable />
          </el-form-item>
          <el-form-item label="日期时间">
            <el-date-picker
              v-model="dateInput"
              type="datetime"
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择日期时间"
              class="full-width"
            />
          </el-form-item>
        </el-form>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="输出" :description="output ? '转换后的时间数据。' : '转换结果会显示在这里。'">
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
import { dateToTimestamp, timestampToDate } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'TimestampTool',
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
