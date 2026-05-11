<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>UUID / 随机</h2>
          <p>生成 UUID v4、随机 Hex 和 Base62 字符串。</p>
        </div>
      </div>
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

    <div class="action-row">
      <el-button type="primary" @click="runGenerate">生成</el-button>
      <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="tool-feedback" />
    <el-card v-if="output" class="result-container" shadow="never">
      <pre class="result-json">{{ output }}</pre>
    </el-card>
  </el-card>
</template>

<script>
import { generateRandomStrings } from '../utils/devTools'
import { applyToolResult, copyToolOutput } from './toolUi'

export default {
  name: 'RandomTool',
  emits: ['toast'],
  data() {
    return {
      mode: 'uuid',
      length: 32,
      count: 1,
      output: '',
      error: '',
    }
  },
  methods: {
    runGenerate() {
      applyToolResult(this, generateRandomStrings({ mode: this.mode, length: this.length, count: this.count }), {
        format: (values) => values.join('\n'),
      })
    },
    async copyOutput() {
      await copyToolOutput(this, this.output, '随机输出')
    },
  },
}
</script>
