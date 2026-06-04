<template>
  <div class="tool-workspace">
    <slot name="input" />
    <slot name="result" />
    <div v-if="$slots.status" class="tool-workspace-status">
      <slot name="status" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'ToolWorkspace',
}
</script>
