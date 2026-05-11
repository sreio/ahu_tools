<template>
  <div class="sidebar" :class="{ 'is-collapsed': collapsed }">
    <div class="brand">
      <div class="brand-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <path
            d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 3a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 3h4l.4-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div v-if="!collapsed" class="brand-copy">
        <h1>{{ appName }}</h1>
        <p class="brand-meta">v{{ version }}<span v-if="author"> · {{ author }}</span></p>
      </div>
      <el-button class="collapse-button" circle size="small" @click="$emit('toggle-collapse')">
        {{ collapsed ? '›' : '‹' }}
      </el-button>
    </div>

    <el-scrollbar class="tool-nav">
      <section v-for="group in groupedTools" :key="group.name" class="nav-group">
        <h2 v-if="!collapsed">{{ group.name }}</h2>
        <el-menu :default-active="activeTool" class="tool-menu" @select="$emit('select-tool', $event)">
          <el-menu-item v-for="tool in group.tools" :key="tool.key" :index="tool.key">
            <el-tooltip :disabled="!collapsed" :content="tool.name" placement="right">
              <div class="nav-item-content">
                <span>{{ collapsed ? (tool.shortName || tool.name.slice(0, 1)) : tool.name }}</span>
                <small v-if="!collapsed">{{ tool.description }}</small>
              </div>
            </el-tooltip>
          </el-menu-item>
        </el-menu>
      </section>
    </el-scrollbar>

    <div class="sidebar-footer">
      <el-popover placement="right-end" trigger="click" :width="220" popper-class="settings-popover">
        <template #reference>
          <el-button class="sidebar-settings-entry" text>
            <el-badge :is-dot="updateAvailable" :hidden="!updateAvailable" class="settings-badge">
              <span class="settings-icon">⚙</span>
            </el-badge>
            <span v-if="!collapsed" class="settings-label">设置</span>
          </el-button>
        </template>

        <div class="settings-menu">
          <div class="settings-menu-title">应用设置</div>
          <button class="settings-menu-item" type="button" @click="$emit('open-tool-order')">
            <span class="settings-menu-icon">↕</span>
            <span>工具排序</span>
          </button>
          <button class="settings-menu-item" type="button" @click="$emit('open-updates')">
            <span class="settings-menu-icon">↻</span>
            <span>检查更新</span>
            <span v-if="updateAvailable" class="settings-menu-dot" />
          </button>
        </div>
      </el-popover>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SidebarNav',
  props: {
    appName: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      default: '',
    },
    tools: {
      type: Array,
      required: true,
    },
    activeTool: {
      type: String,
      required: true,
    },
    collapsed: {
      type: Boolean,
      default: false,
    },
    updateAvailable: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['select-tool', 'toggle-collapse', 'open-updates', 'open-tool-order'],
  computed: {
    groupedTools() {
      const groups = []

      for (const tool of this.tools) {
        let group = groups.find((item) => item.name === tool.group)
        if (!group) {
          group = { name: tool.group, tools: [] }
          groups.push(group)
        }
        group.tools.push(tool)
      }

      return groups
    },
  },
}
</script>
