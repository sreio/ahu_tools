export function applyToolResult(vm, result, options = {}) {
  if (result.ok) {
    vm.output = typeof options.format === 'function' ? options.format(result.value) : result.value
    vm.error = ''
  } else {
    vm.output = ''
    vm.error = result.error
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
