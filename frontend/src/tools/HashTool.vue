<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="计算常用 SHA hash。">
        <template #actions>
          <el-button type="primary" @click="runHash">计算</el-button>
        </template>

        <el-form label-position="top" class="tool-section">
          <el-form-item label="算法">
            <el-select v-model="algorithm" class="full-width">
              <el-option label="SHA-1" value="SHA-1" />
              <el-option label="SHA-256" value="SHA-256" />
              <el-option label="SHA-384" value="SHA-384" />
              <el-option label="SHA-512" value="SHA-512" />
            </el-select>
          </el-form-item>
          <el-form-item label="文本" class="tool-fill-input">
            <el-input v-model="input" type="textarea" placeholder="请输入要计算 hash 的文本" />
          </el-form-item>
        </el-form>

        <template #footer>
          <span>{{ input.length }} 字符</span>
          <el-button text :disabled="!input" @click="input = ''">清空输入</el-button>
        </template>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="输出" :description="output ? `${algorithm} 计算结果。` : '计算结果会显示在这里。'">
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
import { hashText } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'HashTool',
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
      algorithm: 'SHA-256',
      input: '',
      output: '',
      error: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'hash' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.input = snapshot.input || ''
      this.algorithm = snapshot.algorithm || 'SHA-256'
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    async runHash() {
      const result = await hashText(this.input, this.algorithm)
      applyToolResult(this, result, {
        toolKey: 'hash',
        action: this.algorithm,
        inputSnapshot: { input: this.input, algorithm: this.algorithm },
        inputSummary: `${this.algorithm} · ${this.input.length} chars`,
      })
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, 'Hash 输出')
    },
  },
}
</script>
