export function normalizeToolOrder(defaultTools, candidateKeys) {
  const knownKeys = new Set(defaultTools.map((tool) => tool.key))
  const seenKeys = new Set()
  const normalizedKeys = []

  for (const key of candidateKeys || []) {
    if (!knownKeys.has(key) || seenKeys.has(key)) continue
    seenKeys.add(key)
    normalizedKeys.push(key)
  }

  return normalizedKeys
}

export function applySavedToolOrder(defaultTools, savedKeys) {
  const toolByKey = new Map(defaultTools.map((tool) => [tool.key, tool]))
  const orderedTools = []

  for (const key of normalizeToolOrder(defaultTools, savedKeys)) {
    orderedTools.push(toolByKey.get(key))
    toolByKey.delete(key)
  }

  for (const tool of defaultTools) {
    if (toolByKey.has(tool.key)) {
      orderedTools.push(tool)
    }
  }

  return orderedTools
}
