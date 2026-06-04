<template>
  <section class="workbench-shell">
    <header class="workbench-toolbar">
      <div class="workbench-title">
        <h2>{{ activeTool.name }}</h2>
        <p>{{ activeTool.description }}</p>
      </div>

      <el-select
        class="workbench-tool-search"
        filterable
        :model-value="activeTool.key"
        placeholder="搜索工具"
        @change="$emit('select-tool', $event)"
      >
        <el-option
          v-for="tool in tools"
          :key="tool.key"
          :label="`${tool.name} · ${tool.group}`"
          :value="tool.key"
        />
      </el-select>

      <div class="workbench-actions">
        <el-button @click="$emit('open-history', activeTool.key)">历史</el-button>
        <el-button v-if="activeTool.key === 'decrypt'" type="primary" @click="$emit('open-settings')">
          环境配置
        </el-button>
        <el-button v-else-if="activeTool.key === 'h5-decrypt'" type="primary" @click="$emit('open-h5-settings')">
          H5配置
        </el-button>
        <el-popover placement="bottom-end" trigger="click" :width="220">
          <template #reference>
            <el-button>设置</el-button>
          </template>
          <div class="settings-menu">
            <button class="settings-menu-item" type="button" @click="$emit('open-tool-order')">
              <span class="settings-menu-icon">↕</span>
              <span>工具排序</span>
            </button>
            <button class="settings-menu-item" type="button" @click="$emit('open-updates')">
              <span class="settings-menu-icon">↻</span>
              <span>检查更新</span>
            </button>
          </div>
        </el-popover>
      </div>
    </header>

    <div class="workbench-content">
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'WorkbenchShell',
  props: {
    activeTool: {
      type: Object,
      required: true,
    },
    tools: {
      type: Array,
      required: true,
    },
  },
  emits: [
    'select-tool',
    'open-history',
    'open-settings',
    'open-h5-settings',
    'open-updates',
    'open-tool-order',
  ],
}
</script>
