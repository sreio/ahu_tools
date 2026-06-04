import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('application layout', () => {
  it('lets tool cards fill the available main content width', () => {
    const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')
    const toolCardRule = css.match(/\.tool-card\.el-card\s*\{[^}]*\}/)?.[0] || ''

    expect(toolCardRule).toContain('width: 100%')
    expect(toolCardRule).not.toContain('max-width')
  })
})
