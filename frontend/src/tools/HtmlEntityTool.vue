<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="转换 HTML named entity 与数字实体。">
        <template #actions>
          <el-button type="primary" @click="runEncode">实体编码</el-button>
          <el-button @click="runDecode">实体解码</el-button>
        </template>

        <el-input v-model="input" class="tool-fill-input" type="textarea" placeholder="请输入需要编码或解码的文本" />

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
import { decodeHtmlEntities, encodeHtmlEntities } from '../utils/devTools'
import { applyToolResult, copyToolOutput, summarizeText } from './toolUi'

export default {
  name: 'HtmlEntityTool',
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
      if (newValue?.toolKey !== 'html-entity' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    runEncode() {
      applyToolResult(this, encodeHtmlEntities(this.input), {
        toolKey: 'html-entity',
        action: '实体编码',
        inputSnapshot: { input: this.input },
        inputSummary: summarizeText(this.input),
      })
    },
    runDecode() {
      applyToolResult(this, decodeHtmlEntities(this.input), {
        toolKey: 'html-entity',
        action: '实体解码',
        inputSnapshot: { input: this.input },
        inputSummary: summarizeText(this.input),
      })
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'HTML 实体输出')
    },
  },
}
</script>
