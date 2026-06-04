<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="使用 JavaScript RegExp 测试文本匹配结果。">
        <template #actions>
          <el-button type="primary" @click="runTest">测试</el-button>
        </template>

        <el-form label-position="top" class="tool-section">
          <el-form-item label="Pattern">
            <el-input v-model="pattern" placeholder="例如 (?<word>\\w+)" clearable />
          </el-form-item>
          <el-form-item label="Flags（d/g/i/m/s/u/v/y）">
            <el-input v-model="flags" placeholder="例如 gim" clearable />
          </el-form-item>
          <el-form-item label="测试文本" class="tool-fill-input">
            <el-input v-model="text" type="textarea" placeholder="请输入待匹配文本" />
          </el-form-item>
        </el-form>

        <template #footer>
          <span>{{ text.length }} 字符</span>
          <el-button text :disabled="!text" @click="text = ''">清空文本</el-button>
        </template>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="输出" :description="output ? '正则匹配结果。' : '测试结果会显示在这里。'">
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
import { testRegex } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'RegexTool',
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
      pattern: '',
      flags: 'g',
      text: '',
      output: '',
      error: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'regex' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.pattern = snapshot.pattern || ''
      this.flags = snapshot.flags || 'g'
      this.text = snapshot.text || ''
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    runTest() {
      applyToolResult(this, testRegex({ pattern: this.pattern, flags: this.flags, text: this.text }), {
        format: (value) => JSON.stringify(value, null, 2),
        toolKey: 'regex',
        action: '测试正则',
        inputSnapshot: { pattern: this.pattern, flags: this.flags, text: this.text },
        inputSummary: `/${this.pattern}/${this.flags} · ${this.text.length} chars`,
      })
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, '正则测试输出')
    },
  },
}
</script>
