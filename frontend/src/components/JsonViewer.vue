<template>
  <div class="json-viewer">
    <div v-if="parsed.ok" class="json-viewer-toolbar">
      <el-input
        v-model="searchTerm"
        class="json-search"
        size="small"
        clearable
        placeholder="搜索 key 或 value"
      />
      <span v-if="normalizedSearch" class="json-search-count">{{ matchCount }} 个匹配</span>
    </div>

    <div class="json-viewer-body">
      <JsonTreeNode
        v-if="parsed.ok && (!normalizedSearch || matchCount > 0)"
        :value="parsed.value"
        :depth="0"
        :default-expanded-depth="defaultExpandedDepth"
        :node-key="null"
        :is-last="true"
        :search-term="normalizedSearch"
      />
      <div v-else-if="parsed.ok" class="json-search-empty">没有匹配结果</div>
      <pre v-else class="result-json json-viewer-plain">{{ displayText }}</pre>
    </div>
  </div>
</template>

<script>
import JsonTreeNode from './JsonTreeNode.vue'

function normalizeSearchTerm(term) {
  return String(term || '').trim().toLowerCase()
}

function primitiveText(value) {
  if (typeof value === 'string') return value
  if (value === null) return 'null'
  return String(value)
}

function countJsonMatches(value, term, key = null) {
  if (!term) return 0

  const keyMatches = key !== null && String(key).toLowerCase().includes(term) ? 1 : 0

  if (Array.isArray(value)) {
    return keyMatches + value.reduce((count, item) => count + countJsonMatches(item, term), 0)
  }

  if (value && typeof value === 'object') {
    return keyMatches + Object.entries(value).reduce((count, [entryKey, item]) => {
      return count + countJsonMatches(item, term, entryKey)
    }, 0)
  }

  return keyMatches + (primitiveText(value).toLowerCase().includes(term) ? 1 : 0)
}

export default {
  name: 'JsonViewer',
  components: {
    JsonTreeNode,
  },
  props: {
    content: {
      type: String,
      default: '',
    },
    value: {
      type: null,
      default: undefined,
    },
    defaultExpandedDepth: {
      type: Number,
      default: 2,
    },
  },
  data() {
    return {
      searchTerm: '',
    }
  },
  computed: {
    displayText() {
      if (this.value !== undefined) {
        return JSON.stringify(this.value, null, 2)
      }
      return String(this.content ?? '')
    },
    parsed() {
      if (this.value !== undefined) {
        return { ok: true, value: this.value }
      }

      try {
        return { ok: true, value: JSON.parse(this.displayText) }
      } catch {
        return { ok: false, value: null }
      }
    },
    normalizedSearch() {
      return normalizeSearchTerm(this.searchTerm)
    },
    matchCount() {
      if (!this.parsed.ok || !this.normalizedSearch) return 0
      return countJsonMatches(this.parsed.value, this.normalizedSearch)
    },
  },
}
</script>
