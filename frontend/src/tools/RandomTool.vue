<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="生成 UUID v4、随机 Hex 和 Base62 字符串。">
        <template #actions>
          <el-button type="primary" @click="runGenerate">生成</el-button>
        </template>

        <el-form label-position="top">
          <el-form-item label="类型">
            <el-radio-group v-model="mode">
              <el-radio-button label="uuid">UUID v4</el-radio-button>
              <el-radio-button label="hex">Hex</el-radio-button>
              <el-radio-button label="base62">Base62</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="长度（1..512）">
                <el-input-number v-model="length" :min="1" :max="512" :disabled="mode === 'uuid'" class="full-width" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="数量（1..100）">
                <el-input-number v-model="count" :min="1" :max="100" class="full-width" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="输出" :description="output ? '生成后的随机内容。' : '生成结果会显示在这里。'">
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
import { generateRandomStrings } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'RandomTool',
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
      mode: 'uuid',
      length: 32,
      count: 1,
      output: '',
      error: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'random' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.mode = snapshot.mode || 'uuid'
      this.length = snapshot.length || 32
      this.count = snapshot.count || 1
      this.output = ''
      this.error = ''
    },
  },
  methods: {
    runGenerate() {
      applyToolResult(this, generateRandomStrings({ mode: this.mode, length: this.length, count: this.count }), {
        format: (values) => values.join('\n'),
        toolKey: 'random',
        action: this.mode === 'uuid' ? '生成 UUID' : this.mode === 'hex' ? '生成 Hex' : '生成 Base62',
        inputSnapshot: { mode: this.mode, length: this.length, count: this.count },
        inputSummary: `${this.mode} · ${this.count} × ${this.mode === 'uuid' ? 'v4' : this.length}`,
      })
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, '随机输出')
    },
  },
}
</script>
