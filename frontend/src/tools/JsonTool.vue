<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="格式化、压缩或执行低频转换。">
        <template #actions>
          <el-button type="primary" @click="runFormat">格式化</el-button>
          <el-button @click="runMinify">压缩</el-button>
          <el-dropdown>
            <el-button>更多</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="runEncodeUnicode">中文转 Unicode</el-dropdown-item>
                <el-dropdown-item @click="runDecodeUnicode">Unicode 转中文</el-dropdown-item>
                <el-dropdown-item @click="runAddSlashes">添加反斜杠</el-dropdown-item>
                <el-dropdown-item @click="runRemoveSlashes">去除反斜杠</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>

        <JsonEditorPanel v-model="input" class="tool-fill-input" placeholder="请输入 JSON" />

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
          <el-button :disabled="!output" @click="input = output">替换输入</el-button>
        </template>

        <el-alert v-if="error" :title="error" type="error" show-icon />
        <JsonViewer v-else-if="output" :content="output" />
        <div v-else class="tool-empty-result">暂无输出</div>
      </ToolPanel>
    </template>
  </ToolWorkspace>
</template>

<script>
import JsonEditorPanel from '../components/JsonEditorPanel.vue'
import JsonViewer from '../components/JsonViewer.vue'
import ToolPanel from '../components/ToolPanel.vue'
import ToolWorkspace from '../components/ToolWorkspace.vue'
import {
  addJsonSlashes,
  decodeChineseUnicode,
  encodeChineseUnicode,
  formatJson,
  minifyJson,
  removeJsonSlashes,
} from '../utils/devTools'
import { applyToolResult, copyToolOutput, summarizeText } from './toolUi'

export default {
  name: 'JsonTool',
  components: {
    JsonEditorPanel,
    JsonViewer,
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
      if (newValue?.toolKey !== 'json' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    applyResult(result, action) {
      applyToolResult(this, result, {
        toolKey: 'json',
        action,
        inputSnapshot: { input: this.input },
        inputSummary: summarizeText(this.input),
      })
    },
    runFormat() {
      this.applyResult(formatJson(this.input), '格式化')
    },
    runMinify() {
      this.applyResult(minifyJson(this.input), '压缩')
    },
    runEncodeUnicode() {
      this.applyResult(encodeChineseUnicode(this.input), '中文转 Unicode')
    },
    runDecodeUnicode() {
      this.applyResult(decodeChineseUnicode(this.input), 'Unicode 转中文')
    },
    runAddSlashes() {
      this.applyResult(addJsonSlashes(this.input), '添加反斜杠')
    },
    runRemoveSlashes() {
      this.applyResult(removeJsonSlashes(this.input), '去除反斜杠')
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'JSON 输出')
    }
  },
}
</script>
