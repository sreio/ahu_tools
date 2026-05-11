export function summarizeText(text) {
  return `${String(text ?? '').length} chars`
}

export function emitToolAction(vm, payload) {
  vm.$emit('tool-action', {
    schemaVersion: 1,
    ...payload,
    inputSnapshot: JSON.stringify(payload.inputSnapshot),
  })
}

export function applyToolResult(vm, result, options = {}) {
  if (result.ok) {
    vm.output = typeof options.format === 'function' ? options.format(result.value) : result.value
    vm.error = ''
  } else {
    vm.output = ''
    vm.error = result.error
  }

  if (options.toolKey && options.action && options.inputSnapshot) {
    emitToolAction(vm, {
      toolKey: options.toolKey,
      action: options.action,
      success: result.ok,
      inputSnapshot: options.inputSnapshot,
      inputSummary: options.inputSummary,
    })
  }
}

export async function copyToolOutput(vm, output, label = '输出') {
  try {
    await navigator.clipboard.writeText(output)
    vm.$emit('toast', { message: `已复制 ${label}`, type: 'success' })
  } catch {
    vm.$emit('toast', { message: '复制失败', type: 'error' })
  }
}
