<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="URL encode/decode，并提示 malformed URI。">
        <template #actions>
          <el-button type="primary" @click="runEncode">Encode</el-button>
          <el-button @click="runDecode">Decode</el-button>
        </template>

        <el-input v-model="input" class="tool-fill-input" type="textarea" placeholder="请输入 URL 文本" />

        <template #footer>
          <span>{{ input.trim().length }} 字符</span>
          <el-button text :disabled="!input" @click="input = ''">清空输入</el-button>
        </template>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="输出" :description="output ? '转换后的内容。' : '执行操作后输出会显示在这里。'">
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
import { decodeUrl, encodeUrl } from '../utils/devTools'
import { applyToolResult, copyToolOutput, summarizeText } from './toolUi'

export default {
  name: 'UrlTool',
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
      output: '',
      error: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'url' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    applyResult(result, action) {
      applyToolResult(this, result, {
        toolKey: 'url',
        action,
        inputSnapshot: { input: this.input },
        inputSummary: summarizeText(this.input),
      })
    },
    runEncode() {
      this.applyResult(encodeUrl(this.input), 'Encode')
    },
    runDecode() {
      this.applyResult(decodeUrl(this.input), 'Decode')
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'URL 输出')
    },
  },
}
</script>
