<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>时间戳转换</h2>
          <p>秒/毫秒 timestamp 与本地日期时间互转。</p>
        </div>
      </div>
    </template>

    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <el-form label-position="top">
          <el-form-item label="Timestamp">
            <el-input v-model="timestampInput" placeholder="1704067200 或 1704067200000" clearable />
          </el-form-item>
          <el-button type="primary" @click="convertTimestamp">转为日期时间</el-button>
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
          <el-button type="primary" @click="convertDate">转为 timestamp</el-button>
          <el-button @click="useCurrentTime">当前时间</el-button>
        </el-form>
      </el-col>
    </el-row>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import { dateToTimestamp, timestampToDate } from '../utils/devTools'

export default {
  name: 'TimestampTool',
  data() {
    return {
      timestampInput: '',
      dateInput: '',
      output: '',
      error: '',
    }
  },
  methods: {
    applyResult(result) {
      if (result.ok) {
        this.output = JSON.stringify(result.value, null, 2)
        this.error = ''
      } else {
        this.output = ''
        this.error = result.error
      }
    },
    convertTimestamp() {
      this.applyResult(timestampToDate(this.timestampInput))
    },
    convertDate() {
      this.applyResult(dateToTimestamp(this.dateInput))
    },
    useCurrentTime() {
      this.dateInput = new Date()
      this.convertDate()
    },
  },
}
</script>
