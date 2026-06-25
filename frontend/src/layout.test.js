import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('application layout', () => {
  it('removes legacy card-shell styles after workbench migration', () => {
    const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')

    expect(css).not.toMatch(/\.tool-card\.el-card\s*\{/)
    expect(css).not.toMatch(/\.result-container\.el-card\s*\{/)
    expect(css).not.toMatch(/\.tool-header\s*\{/)
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
    const panelBodyRule = css.match(/\.tool-panel-body\s*\{[^}]*\}/)?.[0] || ''
    const fillItemRule = css.match(/\.tool-fill-input\s*\{[^}]*\}/)?.[0] || ''
    const fillContentRule = css.match(/\.tool-fill-input\s+\.el-form-item__content\s*\{[^}]*\}/)?.[0] || ''
    const textareaWrapperRule = css.match(/\.tool-fill-input\s+\.el-textarea\s*\{[^}]*\}/)?.[0] || ''
    const textareaRule = css.match(/\.tool-fill-input\s+\.el-textarea__inner\s*\{[^}]*\}/)?.[0] || ''

    expect(panelBodyRule).toContain('display: flex')
    expect(panelBodyRule).toContain('flex-direction: column')
    expect(fillItemRule).toContain('flex: 1')
    expect(fillItemRule).toContain('min-height: 0')
    expect(fillContentRule).toContain('min-height: 0')
    expect(fillContentRule).toContain('align-items: stretch')
    expect(textareaWrapperRule).toContain('min-height: 0')
    expect(textareaRule).toContain('min-height: 0 !important')
    expect(textareaRule).toContain('height: 100% !important')
    expect(textareaRule).toContain('overflow-y: auto')
    expect(textareaRule).toContain('resize: vertical')
  })

  it('lets empty result states fill the result panel instead of using a fixed height', () => {
    const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')
    const emptyRule = css.match(/\.tool-empty-result\s*\{[^}]*\}/)?.[0] || ''

    expect(emptyRule).toContain('flex: 1')
    expect(emptyRule).toContain('min-height: 0')
    expect(emptyRule).toContain('height: 100%')
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

  it('keeps tool switching in the sidebar instead of adding workbench search', () => {
    const app = readFileSync(resolve(__dirname, 'App.vue'), 'utf8')
    const shell = readFileSync(resolve(__dirname, 'components/WorkbenchShell.vue'), 'utf8')
    const workbenchUsage = app.match(/<WorkbenchShell[\s\S]*?<\/WorkbenchShell>/)?.[0] || ''

    expect(workbenchUsage).not.toContain(':tools="tools"')
    expect(workbenchUsage).not.toContain('@select-tool="selectTool"')
    expect(shell).not.toContain('workbench-tool-search')
    expect(shell).not.toContain('<el-select')
    expect(shell).not.toContain('filterable')
    expect(shell).not.toContain('搜索工具')
    expect(shell).not.toContain("'select-tool'")
  })

  it('keeps app settings in the sidebar instead of duplicating them in the workbench toolbar', () => {
    const shell = readFileSync(resolve(__dirname, 'components/WorkbenchShell.vue'), 'utf8')

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

  it('centralizes JSON rendering in a foldable highlighted viewer', () => {
    const viewer = readFileSync(resolve(__dirname, 'components/JsonViewer.vue'), 'utf8')
    const treeNode = readFileSync(resolve(__dirname, 'components/JsonTreeNode.vue'), 'utf8')
    const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')
    const filenames = [
      'tools/DecryptTool.vue',
      'tools/H5DecryptTool.vue',
      'tools/JsonTool.vue',
      'tools/JwtTool.vue',
      'tools/QueryTool.vue',
      'tools/RegexTool.vue',
      'tools/TimestampTool.vue',
      'tools/RandomTool.vue',
    ]

    expect(viewer).toContain('name: \'JsonViewer\'')
    expect(viewer).toContain("import JsonTreeNode from './JsonTreeNode.vue'")
    expect(viewer).not.toContain('template: `')
    expect(viewer).toContain('class="json-search"')
    expect(viewer).toContain('searchTerm')
    expect(viewer).toContain('matchCount')
    expect(treeNode).toContain('name: \'JsonTreeNode\'')
    expect(treeNode).toContain('class="json-toggle"')
    expect(treeNode).toContain('json-token-key')
    expect(treeNode).toContain('searchTerm')
    expect(treeNode).toContain('visibleEntries')
    expect(viewer).toContain('defaultExpandedDepth')
    expect(css).toMatch(/\.json-viewer\s*\{/)
    expect(css).toMatch(/\.json-viewer-toolbar\s*\{/)
    expect(css).toMatch(/\.json-search\s*\{/)
    expect(css).toMatch(/\.json-toggle\s*\{/)
    expect(css).toMatch(/\.json-token-key\s*\{/)

    for (const filename of filenames) {
      const source = readFileSync(resolve(__dirname, filename), 'utf8')
      expect(source).toContain("import JsonViewer from '../components/JsonViewer.vue'")
      expect(source).toContain('JsonViewer')
    }
  })

  it('uses a JSON editor panel for JSON input fields', () => {
    const editor = readFileSync(resolve(__dirname, 'components/JsonEditorPanel.vue'), 'utf8')
    const json = readFileSync(resolve(__dirname, 'tools/JsonTool.vue'), 'utf8')
    const jwt = readFileSync(resolve(__dirname, 'tools/JwtTool.vue'), 'utf8')

    expect(editor).toContain('name: \'JsonEditorPanel\'')
    expect(editor).toContain('JsonViewer')
    expect(editor).toContain('modelValue')
    expect(json).toContain("import JsonEditorPanel from '../components/JsonEditorPanel.vue'")
    expect(json).toContain('<JsonEditorPanel')
    expect(jwt).toContain("import JsonEditorPanel from '../components/JsonEditorPanel.vue'")
    expect(jwt.match(/<JsonEditorPanel/g)?.length).toBeGreaterThanOrEqual(2)
    expect(jwt).not.toContain('<el-input v-model="signHeader" type="textarea"')
    expect(jwt).not.toContain('<el-input v-model="signPayload" type="textarea"')
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

  it('migrates update checks to the workbench panel pattern', () => {
    const update = readFileSync(resolve(__dirname, 'tools/UpdateTool.vue'), 'utf8')

    expect(update).toContain('<ToolWorkspace>')
    expect(update).toContain('<ToolPanel title="检查"')
    expect(update).toContain('<ToolPanel title="版本信息"')
    expect(update).not.toContain('<el-card class="tool-card"')
    expect(update).not.toContain('class="result-container')
  })
})
