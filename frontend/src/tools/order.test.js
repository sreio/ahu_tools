import { describe, expect, it } from 'vitest'
import { applySavedToolOrder, normalizeToolOrder } from './order'

const defaultTools = [
  { key: 'decrypt', name: '数据解密' },
  { key: 'json', name: 'JSON' },
  { key: 'base64', name: 'Base64' },
  { key: 'url', name: 'URL' },
]

describe('tool ordering', () => {
  it('applies saved tool order and appends missing tools in default order', () => {
    expect(applySavedToolOrder(defaultTools, ['json', 'decrypt']).map((tool) => tool.key)).toEqual([
      'json',
      'decrypt',
      'base64',
      'url',
    ])
  })

  it('ignores unknown and duplicate saved keys', () => {
    expect(applySavedToolOrder(defaultTools, ['missing', 'json', 'json', 'url']).map((tool) => tool.key)).toEqual([
      'json',
      'url',
      'decrypt',
      'base64',
    ])
  })

  it('uses default order when saved order is empty', () => {
    expect(applySavedToolOrder(defaultTools, []).map((tool) => tool.key)).toEqual(['decrypt', 'json', 'base64', 'url'])
  })

  it('normalizes candidate keys before saving', () => {
    expect(normalizeToolOrder(defaultTools, ['url', 'unknown', 'url', 'decrypt'])).toEqual(['url', 'decrypt'])
  })
})
