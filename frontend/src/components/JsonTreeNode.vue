<template>
  <div class="json-tree-node">
    <div v-if="isContainer" class="json-line" :style="lineStyle">
      <button
        v-if="!isEmptyContainer"
        class="json-toggle"
        type="button"
        :aria-label="collapsed ? '展开 JSON 节点' : '折叠 JSON 节点'"
        @click="toggle"
      >{{ collapsed ? '▸' : '▾' }}</button>
      <span v-else class="json-toggle json-toggle-spacer"></span>
      <span v-if="nodeKey !== null" class="json-token-key">{{ keyText(nodeKey) }}</span>
      <span v-if="nodeKey !== null" class="json-punctuation">: </span>
      <span class="json-punctuation">{{ openingToken }}</span>
      <template v-if="isEmptyContainer">
        <span class="json-punctuation">{{ closingToken }}</span>
        <span v-if="!isLast" class="json-punctuation">,</span>
      </template>
      <template v-else-if="shouldShowCollapsedSummary">
        <span class="json-summary"> {{ summary }} </span>
        <span class="json-punctuation">{{ closingToken }}</span>
        <span v-if="!isLast" class="json-punctuation">,</span>
      </template>
    </div>

    <template v-if="shouldShowChildren">
      <JsonTreeNode
        v-for="(entry, index) in visibleEntries"
        :key="entry.key"
        :value="entry.value"
        :node-key="entry.displayKey"
        :depth="depth + 1"
        :default-expanded-depth="defaultExpandedDepth"
        :is-last="index === entries.length - 1"
        :search-term="searchTerm"
      />
      <div class="json-line" :style="lineStyle">
        <span class="json-toggle json-toggle-spacer"></span>
        <span class="json-punctuation">{{ closingToken }}</span>
        <span v-if="!isLast" class="json-punctuation">,</span>
      </div>
    </template>

    <div v-if="!isContainer" class="json-line" :style="lineStyle">
      <span class="json-toggle json-toggle-spacer"></span>
      <span v-if="nodeKey !== null" class="json-token-key">{{ keyText(nodeKey) }}</span>
      <span v-if="nodeKey !== null" class="json-punctuation">: </span>
      <span :class="primitiveClass">{{ primitiveText }}</span>
      <span v-if="!isLast" class="json-punctuation">,</span>
    </div>
  </div>
</template>

<script>
function valueType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export default {
  name: 'JsonTreeNode',
  props: {
    value: {
      type: null,
      required: true,
    },
    nodeKey: {
      type: [String, Number],
      default: null,
    },
    depth: {
      type: Number,
      required: true,
    },
    defaultExpandedDepth: {
      type: Number,
      required: true,
    },
    isLast: {
      type: Boolean,
      default: true,
    },
    searchTerm: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      collapsed: this.depth >= this.defaultExpandedDepth,
    }
  },
  computed: {
    type() {
      return valueType(this.value)
    },
    isContainer() {
      return this.type === 'object' || this.type === 'array'
    },
    entries() {
      if (this.type === 'array') {
        return this.value.map((item, index) => ({ key: index, displayKey: null, value: item }))
      }
      if (this.type === 'object') {
        return Object.entries(this.value).map(([key, item]) => ({ key, displayKey: key, value: item }))
      }
      return []
    },
    normalizedSearch() {
      return String(this.searchTerm || '').trim().toLowerCase()
    },
    visibleEntries() {
      if (!this.normalizedSearch) return this.entries
      return this.entries.filter((entry) => this.entryMatches(entry))
    },
    isEmptyContainer() {
      return this.isContainer && this.entries.length === 0
    },
    isSearchActive() {
      return Boolean(this.normalizedSearch)
    },
    selfMatches() {
      if (!this.normalizedSearch) return false
      if (this.nodeKey !== null && String(this.nodeKey).toLowerCase().includes(this.normalizedSearch)) return true
      if (this.isContainer) return false
      return this.searchablePrimitiveText(this.value).toLowerCase().includes(this.normalizedSearch)
    },
    hasVisibleContent() {
      return !this.isSearchActive || this.selfMatches || this.visibleEntries.length > 0
    },
    shouldShowChildren() {
      if (!this.isContainer || this.isEmptyContainer) return false
      if (this.isSearchActive) return this.visibleEntries.length > 0
      return !this.collapsed
    },
    shouldShowCollapsedSummary() {
      if (this.isEmptyContainer) return false
      if (this.isSearchActive) return this.selfMatches && this.visibleEntries.length === 0
      return this.collapsed
    },
    openingToken() {
      return this.type === 'array' ? '[' : '{'
    },
    closingToken() {
      return this.type === 'array' ? ']' : '}'
    },
    summary() {
      if (this.type === 'array') return `${this.entries.length} items`
      return `${this.entries.length} keys`
    },
    primitiveClass() {
      return `json-token-${this.type}`
    },
    primitiveText() {
      if (this.type === 'string') return JSON.stringify(this.value)
      if (this.type === 'undefined') return 'undefined'
      return String(this.value)
    },
    lineStyle() {
      return {
        paddingLeft: `${this.depth * 18}px`,
      }
    },
  },
  methods: {
    keyText(key) {
      return JSON.stringify(String(key))
    },
    searchablePrimitiveText(value) {
      if (typeof value === 'string') return value
      if (value === null) return 'null'
      return String(value)
    },
    entryMatches(entry) {
      if (!this.normalizedSearch) return true
      const keyMatches = entry.displayKey !== null && String(entry.displayKey).toLowerCase().includes(this.normalizedSearch)
      if (keyMatches) return true
      return this.valueMatches(entry.value)
    },
    valueMatches(value) {
      if (Array.isArray(value)) {
        return value.some((item) => this.valueMatches(item))
      }
      if (value && typeof value === 'object') {
        return Object.entries(value).some(([key, item]) => {
          return String(key).toLowerCase().includes(this.normalizedSearch) || this.valueMatches(item)
        })
      }
      return this.searchablePrimitiveText(value).toLowerCase().includes(this.normalizedSearch)
    },
    toggle() {
      if (!this.isEmptyContainer) {
        this.collapsed = !this.collapsed
      }
    },
  },
}
</script>
