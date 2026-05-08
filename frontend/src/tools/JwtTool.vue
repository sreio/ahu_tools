<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>JWT Decode</h2>
          <p>Decode header 和 payload。</p>
        </div>
      </div>
    </template>

    <el-alert
      title="仅解码 Header 和 Payload，不校验签名，请勿将结果视为可信认证结论。"
      type="warning"
      show-icon
      :closable="false"
      class="tool-feedback"
    />

    <el-input v-model="input" type="textarea" :rows="8" placeholder="请输入 JWT" />
    <div class="action-row">
      <el-button type="primary" @click="runDecode">Decode</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-row v-if="header || payload" :gutter="20" class="two-column-results">
      <el-col :xs="24" :md="12">
        <el-card class="result-container" shadow="never">
          <template #header>Header</template>
          <pre class="result-json">{{ header }}</pre>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="result-container" shadow="never">
          <template #header>Payload</template>
          <pre class="result-json">{{ payload }}</pre>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script>
import { decodeJwt } from '../utils/devTools'

export default {
  name: 'JwtTool',
  data() {
    return {
      input: '',
      header: '',
      payload: '',
      error: '',
    }
  },
  methods: {
    runDecode() {
      const result = decodeJwt(this.input)
      if (result.ok) {
        this.header = result.value.header
        this.payload = result.value.payload
        this.error = ''
      } else {
        this.header = ''
        this.payload = ''
        this.error = result.error
      }
    },
  },
}
</script>
