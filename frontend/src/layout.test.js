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

  it('lets tool panel content fill available height without growing the workbench', () => {
    const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')
    const panelRule = css.match(/\.tool-panel\s*\{[^}]*\}/)?.[0] || ''
    const bodyRule = css.match(/\.tool-panel-body\s*\{[^}]*\}/)?.[0] || ''
    const sectionRule = css.match(/\.tool-panel-body\s+>\s+\.tool-section\s*\{[^}]*\}/)?.[0] || ''

    expect(panelRule).toContain('height: 100%')
    expect(bodyRule).toContain('overflow-y: auto')
    expect(bodyRule).toContain('overscroll-behavior: contain')
    expect(sectionRule).toContain('min-height: 100%')
  })

  it('makes fill inputs expand inside the panel and scroll internally when content is long', () => {
    const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')
    const fillItemRule = css.match(/\.tool-fill-input\s*\{[^}]*\}/)?.[0] || ''
    const fillContentRule = css.match(/\.tool-fill-input\s+\.el-form-item__content\s*\{[^}]*\}/)?.[0] || ''
    const textareaWrapperRule = css.match(/\.tool-fill-input\s+\.el-textarea\s*\{[^}]*\}/)?.[0] || ''
    const textareaRule = css.match(/\.tool-fill-input\s+\.el-textarea__inner\s*\{[^}]*\}/)?.[0] || ''

    expect(fillItemRule).toContain('flex: 1')
    expect(fillItemRule).toContain('min-height: 420px')
    expect(fillContentRule).toContain('min-height: 0')
    expect(fillContentRule).toContain('align-items: stretch')
    expect(textareaWrapperRule).toContain('min-height: 420px')
    expect(textareaRule).toContain('min-height: 420px !important')
    expect(textareaRule).toContain('height: 100% !important')
    expect(textareaRule).toContain('overflow-y: auto')
    expect(textareaRule).toContain('resize: vertical')
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
  })

  it('does not duplicate sidebar navigation and settings in the workbench toolbar', () => {
    const app = readFileSync(resolve(__dirname, 'App.vue'), 'utf8')
    const shell = readFileSync(resolve(__dirname, 'components/WorkbenchShell.vue'), 'utf8')
    const workbenchUsage = app.match(/<WorkbenchShell[\s\S]*?<\/WorkbenchShell>/)?.[0] || ''

    expect(workbenchUsage).not.toContain(':tools="tools"')
    expect(workbenchUsage).not.toContain('@select-tool="selectTool"')
    expect(shell).not.toContain('<el-select')
    expect(shell).not.toContain('搜索工具')
    expect(shell).not.toContain('open-tool-order')
    expect(shell).not.toContain('open-updates')
    expect(shell).not.toContain('<el-popover')
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
