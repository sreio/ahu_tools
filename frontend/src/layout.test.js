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

  it('defines the workbench shell and independently scrolling tool panels', () => {
    const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')

    expect(css).toMatch(/\.workbench-shell\s*\{/)
    expect(css).toMatch(/\.workbench-toolbar\s*\{/)
    expect(css).toMatch(/\.tool-workspace\s*\{/)
    expect(css).toMatch(/\.tool-panel-body\s*\{/)
    expect(css).toMatch(/\.tool-panel-body[^}]*overflow-y:\s*auto/)
  })

  it('keeps tool panel actions outside the scrolling body', () => {
    const panel = readFileSync(resolve(__dirname, 'components/ToolPanel.vue'), 'utf8')

    expect(panel).toContain('class="tool-panel-header"')
    expect(panel).toContain('class="tool-panel-actions"')
    expect(panel).toContain('class="tool-panel-body"')
    expect(panel.indexOf('class="tool-panel-actions"')).toBeLessThan(panel.indexOf('class="tool-panel-body"'))
  })

  it('stacks the workbench columns on narrow screens', () => {
    const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')

    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*\.tool-workspace[\s\S]*grid-template-columns:\s*1fr/)
  })
})
