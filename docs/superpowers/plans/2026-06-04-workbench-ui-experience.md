# Workbench UI Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current card-based tool pages into a workbench UI where navigation, history/config actions, input, output, and copy actions are easier to find and remain visible with long content.

**Architecture:** Add a small set of layout components (`WorkbenchShell`, `ToolWorkspace`, `ToolPanel`) and migrate tools into them in risk order. Keep tool business logic local to existing tool components; the new shared components only handle structure, action placement, and scrolling.

**Tech Stack:** Vue 3 single-file components, Element Plus, Vite, Vitest file/structure tests, existing Wails frontend API wrappers.

---

## File Structure

- Create: `frontend/src/components/WorkbenchShell.vue`
  - Top workbench toolbar for active tool title, tool search, history, config, and app settings.
  - Emits `select-tool`, `open-history`, `open-settings`, `open-h5-settings`, `open-updates`, and `open-tool-order`.

- Create: `frontend/src/components/ToolWorkspace.vue`
  - Two-column input/result layout with responsive single-column fallback.
  - Provides named slots: `input`, `result`, and optional `status`.

- Create: `frontend/src/components/ToolPanel.vue`
  - Panel container with non-scrolling header/actions and independently scrolling body.
  - Provides named slots: `actions`, default body, and `footer`.

- Modify: `frontend/src/App.vue`
  - Wrap the active tool component in `WorkbenchShell`.
  - Move active tool history/config entry points out of migrated tool headers.

- Modify: `frontend/src/style.css`
  - Add workbench, panel, sticky action, overflow-menu, and responsive rules.
  - Keep `.tool-card.el-card { width: 100%; }` regression protection.

- Modify: `frontend/src/layout.test.js`
  - Add structure tests for workbench classes and migrated tool action placement.

- Modify: tool components under `frontend/src/tools/`
  - Migrate high-frequency tools first: `DecryptTool.vue`, `H5DecryptTool.vue`, `JsonTool.vue`.
  - Then complex tools: `JwtTool.vue`, `QueryTool.vue`.
  - Then simpler tools: `Base64Tool.vue`, `UrlTool.vue`, `HtmlEntityTool.vue`, `TimestampTool.vue`, `RandomTool.vue`, `HashTool.vue`, `RegexTool.vue`.

## Task 1: Add Workbench Layout Components

**Files:**
- Create: `frontend/src/components/WorkbenchShell.vue`
- Create: `frontend/src/components/ToolWorkspace.vue`
- Create: `frontend/src/components/ToolPanel.vue`
- Modify: `frontend/src/style.css`
- Modify: `frontend/src/layout.test.js`

- [ ] **Step 1: Write failing layout tests**

Add these tests to `frontend/src/layout.test.js`:

```js
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
```

- [ ] **Step 2: Run the layout tests and verify RED**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: FAIL because `WorkbenchShell.vue`, `ToolPanel.vue`, and the new CSS classes do not exist yet.

- [ ] **Step 3: Create `ToolPanel.vue`**

Create `frontend/src/components/ToolPanel.vue`:

```vue
<template>
  <section class="tool-panel" :class="{ 'is-empty': empty }">
    <header class="tool-panel-header">
      <div class="tool-panel-title">
        <h3>{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="tool-panel-actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="tool-panel-body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="tool-panel-footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script>
export default {
  name: 'ToolPanel',
  props: {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    empty: { type: Boolean, default: false },
  },
}
</script>
```

- [ ] **Step 4: Create `ToolWorkspace.vue`**

Create `frontend/src/components/ToolWorkspace.vue`:

```vue
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
```

- [ ] **Step 5: Create `WorkbenchShell.vue`**

Create `frontend/src/components/WorkbenchShell.vue`:

```vue
<template>
  <section class="workbench-shell">
    <header class="workbench-toolbar">
      <div class="workbench-title">
        <h2>{{ activeTool.name }}</h2>
        <p>{{ activeTool.description }}</p>
      </div>

      <el-select
        class="workbench-tool-search"
        filterable
        :model-value="activeTool.key"
        placeholder="搜索工具"
        @change="$emit('select-tool', $event)"
      >
        <el-option
          v-for="tool in tools"
          :key="tool.key"
          :label="`${tool.name} · ${tool.group}`"
          :value="tool.key"
        />
      </el-select>

      <div class="workbench-actions">
        <el-button @click="$emit('open-history', activeTool.key)">历史</el-button>
        <el-button v-if="activeTool.key === 'decrypt'" type="primary" @click="$emit('open-settings')">环境配置</el-button>
        <el-button v-else-if="activeTool.key === 'h5-decrypt'" type="primary" @click="$emit('open-h5-settings')">H5配置</el-button>
        <el-popover placement="bottom-end" trigger="click" :width="220">
          <template #reference>
            <el-button>设置</el-button>
          </template>
          <div class="settings-menu">
            <button class="settings-menu-item" type="button" @click="$emit('open-tool-order')">
              <span class="settings-menu-icon">↕</span>
              <span>工具排序</span>
            </button>
            <button class="settings-menu-item" type="button" @click="$emit('open-updates')">
              <span class="settings-menu-icon">↻</span>
              <span>检查更新</span>
            </button>
          </div>
        </el-popover>
      </div>
    </header>

    <div class="workbench-content">
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'WorkbenchShell',
  props: {
    activeTool: { type: Object, required: true },
    tools: { type: Array, required: true },
  },
  emits: [
    'select-tool',
    'open-history',
    'open-settings',
    'open-h5-settings',
    'open-updates',
    'open-tool-order',
  ],
}
</script>
```

- [ ] **Step 6: Add workbench CSS**

Append these rules to `frontend/src/style.css`, keeping existing `.tool-card.el-card` rules until all tools are migrated:

```css
.workbench-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: calc(100vh - 64px);
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 14px 38px rgba(45, 55, 72, 0.12);
  overflow: hidden;
}

.workbench-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 360px) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid #e5e7eb;
}

.workbench-title {
  min-width: 0;
}

.workbench-title h2,
.workbench-title p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-title h2 {
  margin: 0 0 4px;
  font-size: 1.45rem;
  color: #111827;
}

.workbench-title p {
  margin: 0;
  color: #6b7280;
}

.workbench-tool-search {
  width: 100%;
}

.workbench-actions,
.tool-panel-actions,
.tool-action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.workbench-content {
  min-height: 0;
  padding: 16px;
  background: #f8fafc;
}

.tool-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.tool-workspace-status {
  grid-column: 1 / -1;
}

.tool-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.tool-panel-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.tool-panel-title {
  min-width: 0;
}

.tool-panel-title h3 {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.tool-panel-title p {
  margin: 4px 0 0;
  color: #6b7280;
}

.tool-panel-body {
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}

.tool-panel-footer {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 10px 16px;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
}

.tool-fill-input .el-textarea,
.tool-fill-input .el-textarea__inner {
  height: 100%;
  min-height: 240px;
}

.tool-fill-input .el-textarea__inner {
  resize: none;
}

.tool-empty-result {
  display: grid;
  min-height: 240px;
  place-items: center;
  color: #9ca3af;
  background: #f8fafc;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
}

.tool-more-menu {
  display: grid;
  gap: 6px;
}

@media (max-width: 900px) {
  .workbench-shell {
    min-height: auto;
  }

  .workbench-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .workbench-actions {
    justify-content: flex-start;
  }

  .tool-workspace {
    grid-template-columns: 1fr;
    height: auto;
  }
}
```

- [ ] **Step 7: Run layout tests and verify GREEN**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/WorkbenchShell.vue frontend/src/components/ToolWorkspace.vue frontend/src/components/ToolPanel.vue frontend/src/style.css frontend/src/layout.test.js
git commit -m "feat: add workbench layout foundation"
```

## Task 2: Integrate the Workbench Shell in App

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/layout.test.js`

- [ ] **Step 1: Write failing App shell structure test**

Add this test to `frontend/src/layout.test.js`:

```js
it('wraps the active tool in the workbench shell', () => {
  const app = readFileSync(resolve(__dirname, 'App.vue'), 'utf8')

  expect(app).toContain("import WorkbenchShell from './components/WorkbenchShell.vue'")
  expect(app).toContain('<WorkbenchShell')
  expect(app).toContain(':active-tool="activeToolDefinition"')
  expect(app).toContain('@select-tool="selectTool"')
})
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: FAIL because `App.vue` does not import or render `WorkbenchShell`.

- [ ] **Step 3: Update `App.vue` imports and components**

Add:

```js
import WorkbenchShell from './components/WorkbenchShell.vue'
```

Register it:

```js
components: {
  ConfigModal,
  H5ConfigModal,
  SidebarNav,
  UpdateTool,
  WorkbenchShell,
},
```

- [ ] **Step 4: Wrap active component**

Replace the direct active component inside `<el-main class="main-content">` with:

```vue
<WorkbenchShell
  :active-tool="activeToolDefinition"
  :tools="tools"
  @select-tool="selectTool"
  @open-history="openToolHistory"
  @open-settings="showSettings = true"
  @open-h5-settings="showH5Settings = true"
  @open-updates="showUpdates = true"
  @open-tool-order="openToolOrder"
>
  <component
    :is="activeToolDefinition.component"
    :configs="configs"
    :app-name="appName"
    :version="version"
    :history-restore="historyRestore"
    :h5-configs="h5Configs"
    @toast="showToast"
    @open-settings="showSettings = true"
    @open-h5-settings="showH5Settings = true"
    @open-history="openToolHistory"
    @tool-action="recordToolAction"
  />
</WorkbenchShell>
```

- [ ] **Step 5: Run test and verify GREEN**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.vue frontend/src/layout.test.js
git commit -m "feat: route tools through workbench shell"
```

## Task 3: Migrate Data Decrypt and H5 Decrypt

**Files:**
- Modify: `frontend/src/tools/DecryptTool.vue`
- Modify: `frontend/src/tools/H5DecryptTool.vue`
- Modify: `frontend/src/layout.test.js`

- [ ] **Step 1: Write failing migration tests**

Add:

```js
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
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: FAIL because both tools still use `el-card class="tool-card"`.

- [ ] **Step 3: Import shared components in both tools**

Add to each script:

```js
import ToolPanel from '../components/ToolPanel.vue'
import ToolWorkspace from '../components/ToolWorkspace.vue'
```

Register:

```js
components: {
  ToolPanel,
  ToolWorkspace,
},
```

- [ ] **Step 4: Replace `DecryptTool.vue` template**

Use this structure:

```vue
<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="选择环境并粘贴 AES-CBC 密文。">
        <template #actions>
          <el-button type="primary" native-type="submit" :loading="loading" :disabled="!isFormValid" @click="handleDecrypt">
            解密数据
          </el-button>
        </template>

        <el-form label-position="top" class="tool-section" @submit.prevent="handleDecrypt">
          <el-form-item label="环境选择">
            <el-select v-model="environment" placeholder="请选择环境" class="full-width">
              <el-option
                v-for="config in configs"
                :key="config.environment"
                :label="config.description || config.environment"
                :value="config.environment"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="加密数据" class="tool-fill-input">
            <el-input v-model="encryptedData" type="textarea" placeholder="请输入要解密的加密数据..." />
          </el-form-item>
        </el-form>

        <template #footer>
          <span>{{ encryptedData.trim().length }} 字符</span>
          <el-button text :disabled="!encryptedData" @click="encryptedData = ''">清空输入</el-button>
        </template>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="结果" :description="result ? '解密结果可切换 JSON 或原始数据。' : '执行解密后结果会显示在这里。'">
        <template #actions>
          <el-button :disabled="!result" @click="copyResult">复制结果</el-button>
          <el-button :disabled="!result && !error" @click="clearResult">清空结果</el-button>
        </template>

        <el-alert v-if="error" :title="error" type="error" show-icon />
        <el-tabs v-else-if="result" v-model="activeTab">
          <el-tab-pane label="JSON格式" name="json">
            <pre class="result-json">{{ formattedJson }}</pre>
          </el-tab-pane>
          <el-tab-pane label="原始数据" name="raw">
            <pre class="result-json">{{ result.raw }}</pre>
          </el-tab-pane>
        </el-tabs>
        <div v-else class="tool-empty-result">暂无结果</div>
      </ToolPanel>
    </template>
  </ToolWorkspace>
</template>
```

- [ ] **Step 5: Replace `H5DecryptTool.vue` template**

Use the same `ToolWorkspace` shape. Keep its mode tabs inside the input panel body before the textarea. Result panel actions are `复制结果` and `清空结果`, and result body keeps JSON/Raw tabs.

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/tools/DecryptTool.vue frontend/src/tools/H5DecryptTool.vue frontend/src/layout.test.js
git commit -m "feat: migrate decrypt tools to workbench panels"
```

## Task 4: Migrate JSON with Overflow Actions

**Files:**
- Modify: `frontend/src/tools/JsonTool.vue`
- Modify: `frontend/src/layout.test.js`

- [ ] **Step 1: Write failing JSON action density test**

Add:

```js
it('uses an overflow menu for low-frequency JSON actions', () => {
  const json = readFileSync(resolve(__dirname, 'tools/JsonTool.vue'), 'utf8')

  expect(json).toContain('<ToolWorkspace>')
  expect(json).toContain('<el-dropdown')
  expect(json).toContain('中文转 Unicode')
  expect(json).toContain('去除反斜杠')
  expect(json).not.toMatch(/<div class="action-row">[\s\S]*中文转 Unicode[\s\S]*去除反斜杠[\s\S]*<\/div>/)
})
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: FAIL because JSON still renders all actions in `.action-row`.

- [ ] **Step 3: Import and register shared components**

Add:

```js
import ToolPanel from '../components/ToolPanel.vue'
import ToolWorkspace from '../components/ToolWorkspace.vue'
```

Register `ToolPanel` and `ToolWorkspace`.

- [ ] **Step 4: Replace JSON template**

Use:

```vue
<template>
  <ToolWorkspace>
    <template #input>
      <ToolPanel title="输入" description="格式化、压缩或执行低频转换。">
        <template #actions>
          <el-button type="primary" @click="runFormat">格式化</el-button>
          <el-button @click="runMinify">压缩</el-button>
          <el-dropdown>
            <el-button>更多</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="runEncodeUnicode">中文转 Unicode</el-dropdown-item>
                <el-dropdown-item @click="runDecodeUnicode">Unicode 转中文</el-dropdown-item>
                <el-dropdown-item @click="runAddSlashes">添加反斜杠</el-dropdown-item>
                <el-dropdown-item @click="runRemoveSlashes">去除反斜杠</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>

        <el-input v-model="input" class="tool-fill-input" type="textarea" placeholder="请输入 JSON" />

        <template #footer>
          <span>{{ input.trim().length }} 字符</span>
          <el-button text :disabled="!input" @click="input = ''">清空输入</el-button>
        </template>
      </ToolPanel>
    </template>

    <template #result>
      <ToolPanel title="输出" :description="output ? '转换后的内容。' : '执行操作后输出会显示在这里。'">
        <template #actions>
          <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
          <el-button :disabled="!output" @click="input = output">替换输入</el-button>
        </template>

        <el-alert v-if="error" :title="error" type="error" show-icon />
        <pre v-else-if="output" class="result-json">{{ output }}</pre>
        <div v-else class="tool-empty-result">暂无输出</div>
      </ToolPanel>
    </template>
  </ToolWorkspace>
</template>
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/tools/JsonTool.vue frontend/src/layout.test.js
git commit -m "feat: organize json actions in workbench"
```

## Task 5: Migrate Simple Encode, Generate, and Test Tools

**Files:**
- Modify: `frontend/src/tools/Base64Tool.vue`
- Modify: `frontend/src/tools/UrlTool.vue`
- Modify: `frontend/src/tools/HtmlEntityTool.vue`
- Modify: `frontend/src/tools/TimestampTool.vue`
- Modify: `frontend/src/tools/RandomTool.vue`
- Modify: `frontend/src/tools/HashTool.vue`
- Modify: `frontend/src/tools/RegexTool.vue`
- Modify: `frontend/src/layout.test.js`

- [ ] **Step 1: Write failing simple-tools migration test**

Add:

```js
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
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: FAIL because these tools still use the old card/action-row layout.

- [ ] **Step 3: Migrate each simple tool using this pattern**

For two-action text tools (`Base64Tool.vue`, `UrlTool.vue`, `HtmlEntityTool.vue`), use:

```vue
<ToolWorkspace>
  <template #input>
    <ToolPanel title="输入">
      <template #actions>
        <el-button type="primary" @click="runEncode">Encode</el-button>
        <el-button @click="runDecode">Decode</el-button>
      </template>
      <el-input v-model="input" class="tool-fill-input" type="textarea" />
    </ToolPanel>
  </template>
  <template #result>
    <ToolPanel title="输出">
      <template #actions>
        <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
      </template>
      <el-alert v-if="error" :title="error" type="error" show-icon />
      <pre v-else-if="output" class="result-json">{{ output }}</pre>
      <div v-else class="tool-empty-result">暂无输出</div>
    </ToolPanel>
  </template>
</ToolWorkspace>
```

For parameter tools (`TimestampTool.vue`, `RandomTool.vue`, `HashTool.vue`, `RegexTool.vue`), keep existing form controls in the input panel body and move the primary action into the input panel `actions` slot. Move copy output into result panel `actions`.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/tools/Base64Tool.vue frontend/src/tools/UrlTool.vue frontend/src/tools/HtmlEntityTool.vue frontend/src/tools/TimestampTool.vue frontend/src/tools/RandomTool.vue frontend/src/tools/HashTool.vue frontend/src/tools/RegexTool.vue frontend/src/layout.test.js
git commit -m "feat: migrate simple tools to workbench"
```

## Task 6: Migrate JWT and Query

**Files:**
- Modify: `frontend/src/tools/JwtTool.vue`
- Modify: `frontend/src/tools/QueryTool.vue`
- Modify: `frontend/src/layout.test.js`

- [ ] **Step 1: Write failing complex-tools tests**

Add:

```js
it('keeps jwt actions scoped to the active mode', () => {
  const jwt = readFileSync(resolve(__dirname, 'tools/JwtTool.vue'), 'utf8')

  expect(jwt).toContain('<ToolWorkspace>')
  expect(jwt).toContain('解码 / 验签')
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
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: FAIL because JWT and Query still use old cards.

- [ ] **Step 3: Migrate `JwtTool.vue`**

Use `ToolWorkspace` with:

- Input panel:
  - Keeps existing `el-tabs v-model="activeTab"`.
  - Decode mode actions: `解密 Token`, `验签`, `清空`, `复制 Token`.
  - Sign mode actions: `生成 Token`, `复制 Token`, `清空`.
- Result panel:
  - Decode mode result cards for Header/Payload/Signature/Verification.
  - Sign mode result token and signature metadata.
  - Result copy buttons stay near each result section or in result panel actions.

The key structural shape is:

```vue
<ToolWorkspace>
  <template #input>
    <ToolPanel title="输入">
      <template #actions>
        <template v-if="activeTab === 'decode'">
          <el-button type="primary" @click="runDecode">解密 Token</el-button>
          <el-button type="success" @click="runVerify">验签</el-button>
          <el-button @click="clearDecode">清空</el-button>
        </template>
        <template v-else>
          <el-button type="primary" @click="runSign">生成 Token</el-button>
          <el-button @click="clearSign">清空</el-button>
        </template>
      </template>
      <!-- existing tabs and forms move here -->
    </ToolPanel>
  </template>
  <template #result>
    <ToolPanel title="结果">
      <!-- existing decoded/sign result sections move here -->
    </ToolPanel>
  </template>
</ToolWorkspace>
```

- [ ] **Step 4: Migrate `QueryTool.vue`**

Use:

```vue
<ToolWorkspace>
  <template #input>
    <ToolPanel title="输入">
      <template #actions>
        <el-button type="primary" @click="runParse">解析</el-button>
        <el-button @click="addRow">添加参数</el-button>
        <el-button @click="runBuild">构建 Query</el-button>
      </template>
      <!-- keep input and row editor here; keep removeRow(index) inline -->
    </ToolPanel>
  </template>
  <template #result>
    <ToolPanel title="输出">
      <template #actions>
        <el-button :disabled="!output" @click="copyOutput">复制输出</el-button>
      </template>
      <pre v-if="output" class="result-json">{{ output }}</pre>
      <div v-else class="tool-empty-result">暂无输出</div>
    </ToolPanel>
  </template>
</ToolWorkspace>
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
npm run test --prefix frontend -- frontend/src/layout.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/tools/JwtTool.vue frontend/src/tools/QueryTool.vue frontend/src/layout.test.js
git commit -m "feat: adapt complex tools to workbench"
```

## Task 7: Full Verification and Manual App Check

**Files:**
- Modify only if verification reveals a specific issue.

- [ ] **Step 1: Run frontend tests**

Run:

```bash
npm run test --prefix frontend
```

Expected: all Vitest suites pass.

- [ ] **Step 2: Run frontend build**

Run:

```bash
npm run build --prefix frontend
```

Expected: Vite build exits 0.

- [ ] **Step 3: Run full verify**

Run:

```bash
make verify
```

Expected: frontend tests, frontend build, Go tests, and version check pass.

- [ ] **Step 4: Rebuild and open the app**

Run:

```bash
GOCACHE=/private/tmp/ahu_tools_gocache wails build -platform darwin/arm64
open build/bin/AhuTools.app
```

Expected: app opens and the workbench shell is visible.

- [ ] **Step 5: Manual UI checklist**

Verify:

- Sidebar collapsed and expanded both leave the workbench filling the main area.
- Decrypt long input keeps `解密数据` visible.
- Decrypt long result keeps `复制结果` visible.
- JSON shows only `格式化`, `压缩`, and `更多` as input-panel primary actions.
- JSON low-frequency operations are available from `更多`.
- JWT decode/sign modes show only mode-relevant actions.
- Query row delete buttons remain inline.
- Narrow window stacks input above result.

- [ ] **Step 6: Commit any final polish**

If Step 5 requires fixes:

```bash
git add frontend/src
git commit -m "fix: polish workbench responsive behavior"
```

If no fixes are needed, do not create an empty commit.

## Self-Review

### Spec Coverage

- Workbench shell and top actions: Tasks 1 and 2.
- Independent input/result scroll and no button遮挡: Task 1 CSS and component structure, verified in Task 7.
- High-frequency decrypt tools: Task 3.
- JSON button density and overflow actions: Task 4.
- Simple tools: Task 5.
- JWT and Query complex action rules: Task 6.
- Testing and manual verification: Task 7.

### Placeholder Scan

The plan contains no unresolved placeholder markers or open-ended implementation gaps. Every task has concrete files, tests, commands, and expected outcomes.

### Type and Prop Consistency

- `WorkbenchShell` receives `activeTool` and `tools`.
- `ToolWorkspace` uses named slots only and has no props.
- `ToolPanel` receives `title`, `description`, and `empty`.
- All migrated tools import from `../components/ToolPanel.vue` and `../components/ToolWorkspace.vue`.
