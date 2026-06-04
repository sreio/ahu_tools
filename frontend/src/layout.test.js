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

  it('wraps the active tool in the workbench shell', () => {
    const app = readFileSync(resolve(__dirname, 'App.vue'), 'utf8')

    expect(app).toContain("import WorkbenchShell from './components/WorkbenchShell.vue'")
    expect(app).toContain('<WorkbenchShell')
    expect(app).toContain(':active-tool="activeToolDefinition"')
    expect(app).toContain('@select-tool="selectTool"')
  })

  it('migrates decrypt tools to input and result panels', () => {
    const decrypt = readFileSync(resolve(__dirname, 'tools/DecryptTool.vue'), 'utf8')
    const h5 = readFileSync(resolve(__dirname, 'tools/H5DecryptTool.vue'), 'utf8')

    for (const source of [decrypt, h5]) {
      expect(source).toContain('<ToolWorkspace>')
      expect(source).toContain('<ToolPanel title="输入"')
      expect(source).toContain('<ToolPanel title="结果"')
      expect(source).not.toContain('<el-card class="tool-card"')
    }
  })

  it('uses an overflow menu for low-frequency JSON actions', () => {
    const json = readFileSync(resolve(__dirname, 'tools/JsonTool.vue'), 'utf8')

    expect(json).toContain('<ToolWorkspace>')
    expect(json).toContain('<el-dropdown')
    expect(json).toContain('中文转 Unicode')
    expect(json).toContain('去除反斜杠')
    expect(json).not.toMatch(/<div class="action-row">[\s\S]*中文转 Unicode[\s\S]*去除反斜杠[\s\S]*<\/div>/)
  })

  it('migrates simple tools to the workbench panel pattern', () => {
    const filenames = [
      'Base64Tool.vue',
      'UrlTool.vue',
      'HtmlEntityTool.vue',
      'TimestampTool.vue',
      'RandomTool.vue',
      'HashTool.vue',
      'RegexTool.vue',
    ]

    for (const filename of filenames) {
      const source = readFileSync(resolve(__dirname, `tools/${filename}`), 'utf8')
      expect(source).toContain('<ToolWorkspace>')
      expect(source).toContain('<ToolPanel title="输入"')
      expect(source).toContain('<ToolPanel title="输出"')
      expect(source).not.toContain('<el-card class="tool-card"')
    }
  })

  it('keeps jwt actions scoped to the active mode', () => {
    const jwt = readFileSync(resolve(__dirname, 'tools/JwtTool.vue'), 'utf8')

    expect(jwt).toContain('<ToolWorkspace>')
    expect(jwt).toContain('解密 / 验签')
    expect(jwt).toContain('加密 / 签名')
    expect(jwt).toContain('<ToolPanel title="输入"')
    expect(jwt).toContain('<ToolPanel title="结果"')
    expect(jwt).not.toContain('<el-card class="tool-card"')
  })

  it('keeps query row actions inline while panel actions stay global', () => {
    const query = readFileSync(resolve(__dirname, 'tools/QueryTool.vue'), 'utf8')

    expect(query).toContain('<ToolWorkspace>')
    expect(query).toContain('<ToolPanel title="输入"')
    expect(query).toContain('<ToolPanel title="输出"')
    expect(query).toContain('@click="removeRow(index)"')
    expect(query).not.toContain('<el-card class="tool-card"')
  })
})
