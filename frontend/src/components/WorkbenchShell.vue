<template>
  <section class="workbench-shell">
    <header class="workbench-toolbar">
      <div class="workbench-title">
        <h2>{{ activeTool.name }}</h2>
        <p>{{ activeTool.description }}</p>
      </div>

      <div class="workbench-actions">
        <el-button @click="$emit('open-history', activeTool.key)">历史</el-button>
        <el-button v-if="activeTool.key === 'decrypt'" type="primary" @click="$emit('open-settings')">
          环境配置
        </el-button>
        <el-button v-else-if="activeTool.key === 'h5-decrypt'" type="primary" @click="$emit('open-h5-settings')">
          H5配置
        </el-button>
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
  },
  emits: [
    'open-history',
    'open-settings',
    'open-h5-settings',
  ],
}
</script>
