<template>
  <section class="tool-panel" :class="{ 'is-empty': empty }">
    <header class="tool-panel-header">
      <div class="tool-panel-title">
        <h3>{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="tool-panel-actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="tool-panel-body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="tool-panel-footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script>
export default {
  name: 'ToolPanel',
  props: {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    empty: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
