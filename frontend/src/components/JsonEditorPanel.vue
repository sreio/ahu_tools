<template>
  <div class="json-editor-panel">
    <el-input
      :model-value="modelValue"
      class="json-editor-input"
      type="textarea"
      :rows="rows"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event)"
    />

    <div class="json-editor-preview">
      <div class="json-editor-preview-header">
        <span>{{ previewTitle }}</span>
        <el-tag v-if="statusText" size="small" :type="statusType">{{ statusText }}</el-tag>
      </div>
      <JsonViewer
        v-if="modelValue.trim()"
        :content="modelValue"
        :default-expanded-depth="defaultExpandedDepth"
      />
      <div v-else class="json-editor-empty">暂无 JSON</div>
    </div>
  </div>
</template>

<script>
import JsonViewer from './JsonViewer.vue'

export default {
  name: 'JsonEditorPanel',
  components: {
    JsonViewer,
  },
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '请输入 JSON',
    },
    rows: {
      type: Number,
      default: 8,
    },
    previewTitle: {
      type: String,
      default: '高亮预览',
    },
    defaultExpandedDepth: {
      type: Number,
      default: 2,
    },
  },
  emits: ['update:modelValue'],
  computed: {
    parseState() {
      if (!this.modelValue.trim()) return 'empty'
      try {
        JSON.parse(this.modelValue)
        return 'valid'
      } catch {
        return 'invalid'
      }
    },
    statusText() {
      if (this.parseState === 'valid') return 'JSON'
      if (this.parseState === 'invalid') return '格式错误'
      return ''
    },
    statusType() {
      return this.parseState === 'valid' ? 'success' : 'danger'
    },
  },
}
</script>
