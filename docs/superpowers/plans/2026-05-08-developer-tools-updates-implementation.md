# Developer Tools and In-App Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Git safety:** Commit checkpoints in this plan are optional. Only run `git commit` steps if the user explicitly authorizes committing during execution.

**Goal:** 把 AhuTools 从单一数据解密工具扩展为左侧导航的开发者工具箱，并支持从 GitHub Release 检查、展示和下载当前平台安装包/可执行产物。

**Architecture:** 前端保持 Vue 3 + Vite，不引入 Router/Pinia/UI library；`App.vue` 作为 shell，工具通过 `frontend/src/tools/index.js` 注册，纯工具逻辑集中在 `frontend/src/utils/devTools.js` 并用 Vitest 覆盖。后端继续使用 Wails `App` public methods 暴露能力，新增 `update.go` 负责 GitHub Release 检查、语义版本比较、平台 asset 匹配和 native save dialog 下载。

**Tech Stack:** Wails v2.11.0, Go 1.22, Vue 3, Vite 5, Vitest, GitHub Actions, GitHub Release API.

---

## File Structure

### Modify

- `frontend/package.json` — add Vitest dependency and `test` script.
- `frontend/src/App.vue` — replace single-tool page with app shell, sidebar, current tool rendering, settings modal, and toast orchestration.
- `.github/workflows/release.yml` — align Go/Wails versions and publish installer/executable-style artifacts.

### Create

- `frontend/src/services/wailsApi.js` — central wrapper around Wails generated imports.
- `frontend/src/utils/devTools.js` — pure utility functions for JSON/Base64/URL/timestamp/hash/JWT tools.
- `frontend/src/utils/devTools.test.js` — Vitest coverage for pure utilities.
- `frontend/src/components/SidebarNav.vue` — left navigation and settings entry.
- `frontend/src/components/ConfigModal.vue` — extracted environment config modal.
- `frontend/src/components/ToastMessage.vue` — extracted toast UI.
- `frontend/src/tools/index.js` — tool registry.
- `frontend/src/tools/DecryptTool.vue` — extracted existing decrypt flow.
- `frontend/src/tools/JsonTool.vue` — JSON format/minify UI.
- `frontend/src/tools/Base64Tool.vue` — UTF-8 Base64 encode/decode UI.
- `frontend/src/tools/UrlTool.vue` — URL encode/decode UI.
- `frontend/src/tools/TimestampTool.vue` — timestamp/date conversion UI.
- `frontend/src/tools/HashTool.vue` — SHA hash calculator UI.
- `frontend/src/tools/JwtTool.vue` — JWT header/payload decode UI with no-signature-verification notice.
- `frontend/src/tools/UpdateTool.vue` — GitHub Release update check/download UI.
- `update.go` — Wails update-check/download methods and internal helpers.
- `update_test.go` — Go tests for version normalization/comparison, JSON parsing, asset matching, and API error mapping.

---

## Task 1: Add frontend utility functions and tests

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/utils/devTools.js`
- Create: `frontend/src/utils/devTools.test.js`

- [ ] **Step 1: Update frontend test tooling**

Modify `frontend/package.json` to add `test` and `vitest`. Keep existing scripts intact.

Expected final scripts/devDependencies shape:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.6.1"
  }
}
```

Run after editing dependencies:

```bash
npm install --prefix frontend
```

Expected: `frontend/package-lock.json` is updated or created consistently with npm.

- [ ] **Step 2: Write failing utility tests**

Create `frontend/src/utils/devTools.test.js`:

```js
import { describe, expect, it } from 'vitest'
import {
  dateToTimestamp,
  decodeBase64,
  decodeJwt,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  formatJson,
  hashText,
  minifyJson,
  timestampToDate,
} from './devTools'

describe('devTools utilities', () => {
  it('formats valid JSON', () => {
    expect(formatJson('{"name":"AhuTools","ok":true}')).toEqual({
      ok: true,
      value: '{\n  "name": "AhuTools",\n  "ok": true\n}',
    })
  })

  it('minifies valid JSON', () => {
    expect(minifyJson('{\n  "name": "AhuTools",\n  "ok": true\n}')).toEqual({
      ok: true,
      value: '{"name":"AhuTools","ok":true}',
    })
  })

  it('returns invalid JSON errors', () => {
    const result = formatJson('{bad json')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('JSON 格式错误，请检查输入内容')
  })

  it('encodes and decodes UTF-8 Base64 text', () => {
    const encoded = encodeBase64('你好 AhuTools')
    expect(encoded).toEqual({ ok: true, value: '5L2g5aW9IEFodVRvb2xz' })
    expect(decodeBase64(encoded.value)).toEqual({ ok: true, value: '你好 AhuTools' })
  })

  it('returns invalid Base64 errors', () => {
    expect(decodeBase64('%%%')).toEqual({
      ok: false,
      error: 'Base64 内容无效，请检查输入内容',
    })
  })

  it('encodes and decodes URLs', () => {
    const encoded = encodeUrl('https://example.com?q=你好&name=AhuTools')
    expect(encoded).toEqual({
      ok: true,
      value: 'https%3A%2F%2Fexample.com%3Fq%3D%E4%BD%A0%E5%A5%BD%26name%3DAhuTools',
    })
    expect(decodeUrl(encoded.value)).toEqual({
      ok: true,
      value: 'https://example.com?q=你好&name=AhuTools',
    })
  })

  it('returns malformed URI errors', () => {
    expect(decodeUrl('%E0%A4%A')).toEqual({
      ok: false,
      error: 'URL 编码内容无效，请检查是否存在 malformed URI',
    })
  })

  it('converts second timestamp to local datetime', () => {
    const result = timestampToDate('1704067200')
    expect(result.ok).toBe(true)
    expect(result.value.timestampMs).toBe(1704067200000)
    expect(result.value.iso).toBe('2024-01-01T00:00:00.000Z')
  })

  it('converts millisecond timestamp to local datetime', () => {
    const result = timestampToDate('1704067200000')
    expect(result.ok).toBe(true)
    expect(result.value.timestampMs).toBe(1704067200000)
    expect(result.value.iso).toBe('2024-01-01T00:00:00.000Z')
  })

  it('rejects invalid timestamp input', () => {
    expect(timestampToDate('abc')).toEqual({
      ok: false,
      error: '时间戳无效，请输入秒或毫秒 timestamp',
    })
  })

  it('converts datetime to second and millisecond timestamps', () => {
    expect(dateToTimestamp('2024-01-01T00:00:00.000Z')).toEqual({
      ok: true,
      value: {
        seconds: 1704067200,
        milliseconds: 1704067200000,
        iso: '2024-01-01T00:00:00.000Z',
        local: expect.any(String),
      },
    })
  })

  it('computes stable SHA hashes', async () => {
    await expect(hashText('AhuTools', 'SHA-256')).resolves.toEqual({
      ok: true,
      value: '9d21cdd7cf47cc3a0be2ea41a4ce332db98b3625963714c35e2e42eed2572b08',
    })
  })

  it('decodes JWT header and payload without verification', () => {
    const token = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWh1VG9vbHMiLCJpYXQiOjE3MDQwNjcyMDB9',
      'signature',
    ].join('.')

    expect(decodeJwt(token)).toEqual({
      ok: true,
      value: {
        header: '{\n  "alg": "HS256",\n  "typ": "JWT"\n}',
        payload: '{\n  "sub": "123",\n  "name": "AhuTools",\n  "iat": 1704067200\n}',
      },
    })
  })

  it('rejects malformed JWT input', () => {
    expect(decodeJwt('not-a-token')).toEqual({
      ok: false,
      error: 'JWT 格式错误，应包含 header.payload.signature 三段内容',
    })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail before implementation**

Run:

```bash
npm run test --prefix frontend
```

Expected: FAIL because `frontend/src/utils/devTools.js` does not exist yet.

- [ ] **Step 4: Implement utility functions**

Create `frontend/src/utils/devTools.js`:

```js
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8', { fatal: true })

function success(value) {
  return { ok: true, value }
}

function failure(error) {
  return { ok: false, error }
}

function parseJson(input) {
  try {
    return success(JSON.parse(input))
  } catch {
    return failure('JSON 格式错误，请检查输入内容')
  }
}

export function formatJson(input) {
  const parsed = parseJson(input)
  if (!parsed.ok) return parsed
  return success(JSON.stringify(parsed.value, null, 2))
}

export function minifyJson(input) {
  const parsed = parseJson(input)
  if (!parsed.ok) return parsed
  return success(JSON.stringify(parsed.value))
}

export function encodeBase64(input) {
  const bytes = textEncoder.encode(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return success(btoa(binary))
}

export function decodeBase64(input) {
  try {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input) || input.length % 4 === 1) {
      return failure('Base64 内容无效，请检查输入内容')
    }

    const binary = atob(input)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return success(textDecoder.decode(bytes))
  } catch {
    return failure('Base64 内容无效，请检查输入内容')
  }
}

export function encodeUrl(input) {
  try {
    return success(encodeURIComponent(input))
  } catch {
    return failure('URL 编码失败，请检查输入内容')
  }
}

export function decodeUrl(input) {
  try {
    return success(decodeURIComponent(input))
  } catch {
    return failure('URL 编码内容无效，请检查是否存在 malformed URI')
  }
}

export function timestampToDate(input) {
  const normalized = String(input).trim()
  if (!/^\d{10}$|^\d{13}$/.test(normalized)) {
    return failure('时间戳无效，请输入秒或毫秒 timestamp')
  }

  const timestamp = Number(normalized)
  const timestampMs = normalized.length === 10 ? timestamp * 1000 : timestamp
  const date = new Date(timestampMs)

  if (Number.isNaN(date.getTime())) {
    return failure('时间戳无效，请输入秒或毫秒 timestamp')
  }

  return success({
    timestampMs,
    iso: date.toISOString(),
    local: date.toLocaleString(),
  })
}

export function dateToTimestamp(input) {
  const date = new Date(input)
  if (!input || Number.isNaN(date.getTime())) {
    return failure('日期时间无效，请输入可解析的日期时间')
  }

  const milliseconds = date.getTime()
  return success({
    seconds: Math.floor(milliseconds / 1000),
    milliseconds,
    iso: date.toISOString(),
    local: date.toLocaleString(),
  })
}

export async function hashText(input, algorithm) {
  try {
    const digest = await crypto.subtle.digest(algorithm, textEncoder.encode(input))
    const bytes = Array.from(new Uint8Array(digest))
    return success(bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(''))
  } catch {
    return failure('Hash 计算失败，请检查算法是否受当前环境支持')
  }
}

function decodeBase64UrlJson(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const decoded = decodeBase64(padded)
  if (!decoded.ok) return decoded

  try {
    return success(JSON.parse(decoded.value))
  } catch {
    return failure('JWT 内容不是有效 JSON')
  }
}

export function decodeJwt(input) {
  const parts = String(input).trim().split('.')
  if (parts.length !== 3 || parts.some((part) => !part)) {
    return failure('JWT 格式错误，应包含 header.payload.signature 三段内容')
  }

  const header = decodeBase64UrlJson(parts[0])
  if (!header.ok) return failure(header.error)

  const payload = decodeBase64UrlJson(parts[1])
  if (!payload.ok) return failure(payload.error)

  return success({
    header: JSON.stringify(header.value, null, 2),
    payload: JSON.stringify(payload.value, null, 2),
  })
}
```

- [ ] **Step 5: Verify utility tests pass**

Run:

```bash
npm run test --prefix frontend
```

Expected: PASS for all `devTools` tests.

- [ ] **Step 6: Optional commit checkpoint**

Only if commit authorization exists:

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/utils/devTools.js frontend/src/utils/devTools.test.js
git commit -m "test: add developer tool utilities"
```

---

## Task 2: Add Wails API wrapper and shared shell components

**Files:**
- Create: `frontend/src/services/wailsApi.js`
- Create: `frontend/src/components/ToastMessage.vue`
- Create: `frontend/src/components/ConfigModal.vue`
- Create: `frontend/src/components/SidebarNav.vue`

- [ ] **Step 1: Create Wails API wrapper**

Create `frontend/src/services/wailsApi.js`:

```js
export {
  CheckForUpdate,
  Decrypt,
  DownloadUpdate,
  GetAllConfigs,
  GetAppName,
  GetAuthor,
  GetVersion,
  SaveConfig,
} from '../../wailsjs/go/main/App'
```

This file will fail during frontend-only development until Wails bindings are regenerated after Go methods are added. That is expected until Task 5 completes.

- [ ] **Step 2: Create toast component**

Create `frontend/src/components/ToastMessage.vue`:

```vue
<template>
  <transition name="toast">
    <div v-if="message" class="toast" :class="type">
      {{ message }}
    </div>
  </transition>
</template>

<script>
export default {
  name: 'ToastMessage',
  props: {
    message: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'success',
    },
  },
}
</script>
```

- [ ] **Step 3: Create config modal component**

Create `frontend/src/components/ConfigModal.vue`:

```vue
<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>环境配置</h2>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>

      <div class="config-list">
        <div v-for="config in configs" :key="config.id" class="config-item">
          <div>
            <strong>{{ config.environment }}</strong>
            <p>{{ config.description }}</p>
          </div>
        </div>
      </div>

      <form class="config-form" @submit.prevent="submitConfig">
        <h3>新增或更新配置</h3>
        <label>
          环境名称
          <input v-model="form.environment" type="text" placeholder="production" required />
        </label>
        <label>
          AES Key
          <input v-model="form.key" type="password" placeholder="16/24/32 字节 key" required />
        </label>
        <label>
          描述
          <input v-model="form.description" type="text" placeholder="配置说明" />
        </label>
        <button type="submit" class="btn primary">保存配置</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfigModal',
  props: {
    configs: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['close', 'save'],
  data() {
    return {
      form: {
        environment: '',
        key: '',
        description: '',
      },
    }
  },
  methods: {
    submitConfig() {
      this.$emit('save', { ...this.form })
      this.form = {
        environment: '',
        key: '',
        description: '',
      }
    },
  },
}
</script>
```

- [ ] **Step 4: Create sidebar navigation component**

Create `frontend/src/components/SidebarNav.vue`:

```vue
<template>
  <aside class="sidebar">
    <div class="brand">
      <h1>{{ appName }}</h1>
      <p>v{{ version }}</p>
    </div>

    <nav class="tool-nav">
      <section v-for="group in groupedTools" :key="group.name" class="nav-group">
        <h2>{{ group.name }}</h2>
        <button
          v-for="tool in group.tools"
          :key="tool.key"
          class="nav-item"
          :class="{ active: tool.key === activeTool }"
          type="button"
          @click="$emit('select-tool', tool.key)"
        >
          <span>{{ tool.name }}</span>
          <small>{{ tool.description }}</small>
        </button>
      </section>
    </nav>

    <button class="settings-button" type="button" @click="$emit('open-settings')">
      环境配置
    </button>
  </aside>
</template>

<script>
export default {
  name: 'SidebarNav',
  props: {
    appName: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    tools: {
      type: Array,
      required: true,
    },
    activeTool: {
      type: String,
      required: true,
    },
  },
  emits: ['select-tool', 'open-settings'],
  computed: {
    groupedTools() {
      const groups = []
      for (const tool of this.tools) {
        let group = groups.find((item) => item.name === tool.group)
        if (!group) {
          group = { name: tool.group, tools: [] }
          groups.push(group)
        }
        group.tools.push(tool)
      }
      return groups
    },
  },
}
</script>
```

- [ ] **Step 5: Verify component syntax during full frontend build later**

Do not run `npm run build --prefix frontend` yet if `CheckForUpdate`/`DownloadUpdate` bindings do not exist. Full build verification happens after Task 5 regenerates Wails bindings.

- [ ] **Step 6: Optional commit checkpoint**

Only if commit authorization exists:

```bash
git add frontend/src/services/wailsApi.js frontend/src/components/ToastMessage.vue frontend/src/components/ConfigModal.vue frontend/src/components/SidebarNav.vue
git commit -m "refactor: add app shell components"
```

---

## Task 3: Extract decrypt tool and build app shell

**Files:**
- Create: `frontend/src/tools/DecryptTool.vue`
- Create: `frontend/src/tools/index.js`
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Create decrypt tool component from existing behavior**

Create `frontend/src/tools/DecryptTool.vue`:

```vue
<template>
  <section class="tool-card">
    <div class="tool-header">
      <div>
        <h2>数据解密</h2>
        <p>保留现有 AES-CBC 数据解密能力。</p>
      </div>
    </div>

    <form class="tool-form" @submit.prevent="handleDecrypt">
      <label>
        环境
        <select v-model="environment" :disabled="loading">
          <option v-for="config in configs" :key="config.environment" :value="config.environment">
            {{ config.environment }} - {{ config.description }}
          </option>
        </select>
      </label>

      <label>
        待解密内容
        <textarea
          v-model="encryptedData"
          :disabled="loading"
          placeholder="请输入 Base64 编码的密文"
          rows="8"
        />
      </label>

      <div class="action-row">
        <button class="btn primary" type="submit" :disabled="loading">
          {{ loading ? '解密中...' : '开始解密' }}
        </button>
        <button class="btn" type="button" :disabled="loading" @click="clearResult">
          清空
        </button>
      </div>
    </form>

    <div v-if="error" class="error-box">{{ error }}</div>

    <div v-if="result" class="result-card">
      <div class="result-tabs">
        <button :class="{ active: activeTab === 'formatted' }" @click="activeTab = 'formatted'">
          格式化
        </button>
        <button :class="{ active: activeTab === 'raw' }" @click="activeTab = 'raw'">
          原始文本
        </button>
      </div>
      <pre>{{ resultContent }}</pre>
      <button class="btn" type="button" @click="copyResult">复制结果</button>
    </div>
  </section>
</template>

<script>
import { Decrypt } from '../services/wailsApi'

export default {
  name: 'DecryptTool',
  props: {
    configs: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['toast'],
  data() {
    return {
      environment: '',
      encryptedData: '',
      loading: false,
      result: null,
      error: '',
      activeTab: 'formatted',
    }
  },
  computed: {
    resultContent() {
      if (!this.result) return ''
      if (this.activeTab === 'raw') return this.result.raw || ''
      if (this.result.isJson) return JSON.stringify(this.result.data, null, 2)
      return this.result.raw || ''
    },
  },
  watch: {
    configs: {
      immediate: true,
      handler(configs) {
        if (!this.environment && configs.length > 0) {
          this.environment = configs[0].environment
        }
      },
    },
  },
  methods: {
    async handleDecrypt() {
      if (!this.encryptedData.trim()) {
        this.error = '请输入待解密内容'
        return
      }

      this.loading = true
      this.error = ''
      this.result = null

      try {
        const response = await Decrypt(this.encryptedData, this.environment)
        if (response.success) {
          this.result = response
          this.activeTab = response.isJson ? 'formatted' : 'raw'
          this.$emit('toast', { message: '解密成功', type: 'success' })
        } else {
          this.error = response.error || '解密失败'
        }
      } catch {
        this.error = '调用解密服务失败，请稍后重试'
      } finally {
        this.loading = false
      }
    },
    async copyResult() {
      if (!this.resultContent) return
      await navigator.clipboard.writeText(this.resultContent)
      this.$emit('toast', { message: '已复制到剪贴板', type: 'success' })
    },
    clearResult() {
      this.encryptedData = ''
      this.result = null
      this.error = ''
    },
  },
}
</script>
```

- [ ] **Step 2: Create tool registry**

Create `frontend/src/tools/index.js`:

```js
import Base64Tool from './Base64Tool.vue'
import DecryptTool from './DecryptTool.vue'
import HashTool from './HashTool.vue'
import JsonTool from './JsonTool.vue'
import JwtTool from './JwtTool.vue'
import TimestampTool from './TimestampTool.vue'
import UpdateTool from './UpdateTool.vue'
import UrlTool from './UrlTool.vue'

export const tools = [
  {
    key: 'decrypt',
    name: '数据解密',
    group: '现有工具',
    description: 'AES-CBC 解密',
    component: DecryptTool,
  },
  {
    key: 'json',
    name: 'JSON',
    group: '文本处理',
    description: '格式化与压缩',
    component: JsonTool,
  },
  {
    key: 'base64',
    name: 'Base64',
    group: '编码转换',
    description: 'UTF-8 编解码',
    component: Base64Tool,
  },
  {
    key: 'url',
    name: 'URL',
    group: '编码转换',
    description: 'encode/decode',
    component: UrlTool,
  },
  {
    key: 'timestamp',
    name: '时间戳',
    group: '开发辅助',
    description: '时间互转',
    component: TimestampTool,
  },
  {
    key: 'hash',
    name: 'Hash',
    group: '开发辅助',
    description: 'SHA 摘要',
    component: HashTool,
  },
  {
    key: 'jwt',
    name: 'JWT Decode',
    group: '开发辅助',
    description: '仅 decode',
    component: JwtTool,
  },
  {
    key: 'updates',
    name: '应用更新',
    group: '应用',
    description: '检查 GitHub Release',
    component: UpdateTool,
  },
]
```

- [ ] **Step 3: Replace `App.vue` with shell orchestration**

Modify `frontend/src/App.vue` so it imports shell components, registry, and API wrapper. Preserve or migrate existing visual styles, but the script must follow this shape:

```vue
<template>
  <div class="app-shell">
    <SidebarNav
      :app-name="appName"
      :version="version"
      :tools="tools"
      :active-tool="activeTool"
      @select-tool="activeTool = $event"
      @open-settings="showSettings = true"
    />

    <main class="main-content">
      <component
        :is="activeToolDefinition.component"
        :configs="configs"
        :app-name="appName"
        :version="version"
        @toast="showToast"
        @configs-updated="loadConfigs"
      />
    </main>

    <ConfigModal
      v-if="showSettings"
      :configs="configs"
      @close="showSettings = false"
      @save="saveConfig"
    />

    <ToastMessage :message="toast.message" :type="toast.type" />
  </div>
</template>

<script>
import ConfigModal from './components/ConfigModal.vue'
import SidebarNav from './components/SidebarNav.vue'
import ToastMessage from './components/ToastMessage.vue'
import { GetAllConfigs, GetAppName, GetAuthor, GetVersion, SaveConfig } from './services/wailsApi'
import { tools } from './tools'

export default {
  name: 'App',
  components: {
    ConfigModal,
    SidebarNav,
    ToastMessage,
  },
  data() {
    return {
      tools,
      activeTool: 'decrypt',
      appName: 'AhuTools',
      version: '1.0.0',
      author: '',
      configs: [],
      showSettings: false,
      toast: {
        message: '',
        type: 'success',
      },
    }
  },
  computed: {
    activeToolDefinition() {
      return this.tools.find((tool) => tool.key === this.activeTool) || this.tools[0]
    },
  },
  async mounted() {
    await Promise.all([this.loadAppInfo(), this.loadConfigs()])
  },
  methods: {
    async loadAppInfo() {
      try {
        const [appName, version, author] = await Promise.all([GetAppName(), GetVersion(), GetAuthor()])
        this.appName = appName
        this.version = version
        this.author = author
      } catch {
        this.showToast({ message: '加载应用信息失败', type: 'error' })
      }
    },
    async loadConfigs() {
      try {
        this.configs = await GetAllConfigs()
      } catch {
        this.showToast({ message: '加载环境配置失败', type: 'error' })
      }
    },
    async saveConfig(config) {
      try {
        const response = await SaveConfig(config.environment, config.key, config.description)
        if (response.success) {
          this.showToast({ message: '配置保存成功', type: 'success' })
          await this.loadConfigs()
        } else {
          this.showToast({ message: response.error || '配置保存失败', type: 'error' })
        }
      } catch {
        this.showToast({ message: '调用配置服务失败', type: 'error' })
      }
    },
    showToast({ message, type = 'success' }) {
      this.toast = { message, type }
      window.clearTimeout(this.toastTimer)
      this.toastTimer = window.setTimeout(() => {
        this.toast = { message: '', type: 'success' }
      }, 3000)
    },
  },
}
</script>
```

Add or preserve CSS classes used by the shell and components: `.app-shell`, `.sidebar`, `.brand`, `.tool-nav`, `.nav-group`, `.nav-item`, `.settings-button`, `.main-content`, `.tool-card`, `.tool-header`, `.tool-form`, `.action-row`, `.btn`, `.primary`, `.error-box`, `.result-card`, `.result-tabs`, `.modal-overlay`, `.modal`, `.modal-header`, `.modal-close`, `.config-list`, `.config-item`, `.config-form`, `.toast`.

- [ ] **Step 4: Verify no direct Wails generated imports remain in app code outside wrapper**

Run:

```bash
grep -R "wailsjs/go/main/App" frontend/src
```

Expected: only `frontend/src/services/wailsApi.js` contains this import path.

- [ ] **Step 5: Optional commit checkpoint**

Only if commit authorization exists:

```bash
git add frontend/src/App.vue frontend/src/tools/DecryptTool.vue frontend/src/tools/index.js
git commit -m "refactor: introduce developer tools shell"
```

---

## Task 4: Add first-version tool components

**Files:**
- Create: `frontend/src/tools/JsonTool.vue`
- Create: `frontend/src/tools/Base64Tool.vue`
- Create: `frontend/src/tools/UrlTool.vue`
- Create: `frontend/src/tools/TimestampTool.vue`
- Create: `frontend/src/tools/HashTool.vue`
- Create: `frontend/src/tools/JwtTool.vue`

- [ ] **Step 1: Create JSON tool**

Create `frontend/src/tools/JsonTool.vue`:

```vue
<template>
  <section class="tool-card">
    <div class="tool-header"><h2>JSON</h2><p>格式化、压缩并提示 JSON 错误。</p></div>
    <textarea v-model="input" rows="10" placeholder="请输入 JSON" />
    <div class="action-row">
      <button class="btn primary" @click="runFormat">格式化</button>
      <button class="btn" @click="runMinify">压缩</button>
      <button class="btn" :disabled="!output" @click="copyOutput">复制输出</button>
    </div>
    <div v-if="error" class="error-box">{{ error }}</div>
    <pre v-if="output" class="result-card">{{ output }}</pre>
  </section>
</template>

<script>
import { formatJson, minifyJson } from '../utils/devTools'

export default {
  name: 'JsonTool',
  emits: ['toast'],
  data() {
    return { input: '', output: '', error: '' }
  },
  methods: {
    applyResult(result) {
      if (result.ok) {
        this.output = result.value
        this.error = ''
      } else {
        this.output = ''
        this.error = result.error
      }
    },
    runFormat() { this.applyResult(formatJson(this.input)) },
    runMinify() { this.applyResult(minifyJson(this.input)) },
    async copyOutput() {
      await navigator.clipboard.writeText(this.output)
      this.$emit('toast', { message: '已复制 JSON 输出', type: 'success' })
    },
  },
}
</script>
```

- [ ] **Step 2: Create Base64 tool**

Create `frontend/src/tools/Base64Tool.vue`:

```vue
<template>
  <section class="tool-card">
    <div class="tool-header"><h2>Base64</h2><p>UTF-8 text encode/decode。</p></div>
    <textarea v-model="input" rows="8" placeholder="请输入文本或 Base64" />
    <div class="action-row">
      <button class="btn primary" @click="runEncode">Encode</button>
      <button class="btn" @click="runDecode">Decode</button>
      <button class="btn" :disabled="!output" @click="copyOutput">复制输出</button>
    </div>
    <div v-if="error" class="error-box">{{ error }}</div>
    <pre v-if="output" class="result-card">{{ output }}</pre>
  </section>
</template>

<script>
import { decodeBase64, encodeBase64 } from '../utils/devTools'

export default {
  name: 'Base64Tool',
  emits: ['toast'],
  data() { return { input: '', output: '', error: '' } },
  methods: {
    applyResult(result) {
      if (result.ok) { this.output = result.value; this.error = '' } else { this.output = ''; this.error = result.error }
    },
    runEncode() { this.applyResult(encodeBase64(this.input)) },
    runDecode() { this.applyResult(decodeBase64(this.input)) },
    async copyOutput() {
      await navigator.clipboard.writeText(this.output)
      this.$emit('toast', { message: '已复制 Base64 输出', type: 'success' })
    },
  },
}
</script>
```

- [ ] **Step 3: Create URL tool**

Create `frontend/src/tools/UrlTool.vue`:

```vue
<template>
  <section class="tool-card">
    <div class="tool-header"><h2>URL</h2><p>encodeURIComponent / decodeURIComponent。</p></div>
    <textarea v-model="input" rows="8" placeholder="请输入 URL 文本" />
    <div class="action-row">
      <button class="btn primary" @click="runEncode">Encode</button>
      <button class="btn" @click="runDecode">Decode</button>
      <button class="btn" :disabled="!output" @click="copyOutput">复制输出</button>
    </div>
    <div v-if="error" class="error-box">{{ error }}</div>
    <pre v-if="output" class="result-card">{{ output }}</pre>
  </section>
</template>

<script>
import { decodeUrl, encodeUrl } from '../utils/devTools'

export default {
  name: 'UrlTool',
  emits: ['toast'],
  data() { return { input: '', output: '', error: '' } },
  methods: {
    applyResult(result) {
      if (result.ok) { this.output = result.value; this.error = '' } else { this.output = ''; this.error = result.error }
    },
    runEncode() { this.applyResult(encodeUrl(this.input)) },
    runDecode() { this.applyResult(decodeUrl(this.input)) },
    async copyOutput() {
      await navigator.clipboard.writeText(this.output)
      this.$emit('toast', { message: '已复制 URL 输出', type: 'success' })
    },
  },
}
</script>
```

- [ ] **Step 4: Create timestamp tool**

Create `frontend/src/tools/TimestampTool.vue`:

```vue
<template>
  <section class="tool-card">
    <div class="tool-header"><h2>时间戳转换</h2><p>秒/毫秒 timestamp 与日期时间互转。</p></div>
    <label>Timestamp<input v-model="timestampInput" placeholder="1704067200 或 1704067200000" /></label>
    <button class="btn primary" @click="convertTimestamp">转为日期时间</button>
    <label>日期时间<input v-model="dateInput" type="datetime-local" /></label>
    <button class="btn" @click="convertDate">转为 timestamp</button>
    <div v-if="error" class="error-box">{{ error }}</div>
    <pre v-if="output" class="result-card">{{ output }}</pre>
  </section>
</template>

<script>
import { dateToTimestamp, timestampToDate } from '../utils/devTools'

export default {
  name: 'TimestampTool',
  data() { return { timestampInput: '', dateInput: '', output: '', error: '' } },
  methods: {
    applyResult(result) {
      if (result.ok) { this.output = JSON.stringify(result.value, null, 2); this.error = '' } else { this.output = ''; this.error = result.error }
    },
    convertTimestamp() { this.applyResult(timestampToDate(this.timestampInput)) },
    convertDate() { this.applyResult(dateToTimestamp(this.dateInput)) },
  },
}
</script>
```

- [ ] **Step 5: Create Hash tool**

Create `frontend/src/tools/HashTool.vue`:

```vue
<template>
  <section class="tool-card">
    <div class="tool-header"><h2>Hash</h2><p>计算常用 SHA hash。</p></div>
    <label>算法<select v-model="algorithm"><option>SHA-1</option><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option></select></label>
    <textarea v-model="input" rows="8" placeholder="请输入要计算 hash 的文本" />
    <div class="action-row">
      <button class="btn primary" @click="runHash">计算</button>
      <button class="btn" :disabled="!output" @click="copyOutput">复制输出</button>
    </div>
    <div v-if="error" class="error-box">{{ error }}</div>
    <pre v-if="output" class="result-card">{{ output }}</pre>
  </section>
</template>

<script>
import { hashText } from '../utils/devTools'

export default {
  name: 'HashTool',
  emits: ['toast'],
  data() { return { algorithm: 'SHA-256', input: '', output: '', error: '' } },
  methods: {
    async runHash() {
      const result = await hashText(this.input, this.algorithm)
      if (result.ok) { this.output = result.value; this.error = '' } else { this.output = ''; this.error = result.error }
    },
    async copyOutput() {
      await navigator.clipboard.writeText(this.output)
      this.$emit('toast', { message: '已复制 Hash 输出', type: 'success' })
    },
  },
}
</script>
```

- [ ] **Step 6: Create JWT tool**

Create `frontend/src/tools/JwtTool.vue`:

```vue
<template>
  <section class="tool-card">
    <div class="tool-header"><h2>JWT Decode</h2><p>Decode header 和 payload；不做签名校验。</p></div>
    <div class="notice-box">仅 decode，不校验签名。不要把这里展示的内容视为可信身份或授权结果。</div>
    <textarea v-model="input" rows="8" placeholder="请输入 JWT" />
    <button class="btn primary" @click="runDecode">Decode</button>
    <div v-if="error" class="error-box">{{ error }}</div>
    <div v-if="header || payload" class="two-column-results">
      <div><h3>Header</h3><pre class="result-card">{{ header }}</pre></div>
      <div><h3>Payload</h3><pre class="result-card">{{ payload }}</pre></div>
    </div>
  </section>
</template>

<script>
import { decodeJwt } from '../utils/devTools'

export default {
  name: 'JwtTool',
  data() { return { input: '', header: '', payload: '', error: '' } },
  methods: {
    runDecode() {
      const result = decodeJwt(this.input)
      if (result.ok) {
        this.header = result.value.header
        this.payload = result.value.payload
        this.error = ''
      } else {
        this.header = ''
        this.payload = ''
        this.error = result.error
      }
    },
  },
}
</script>
```

- [ ] **Step 7: Verify utility tests still pass**

Run:

```bash
npm run test --prefix frontend
```

Expected: PASS.

- [ ] **Step 8: Optional commit checkpoint**

Only if commit authorization exists:

```bash
git add frontend/src/tools/JsonTool.vue frontend/src/tools/Base64Tool.vue frontend/src/tools/UrlTool.vue frontend/src/tools/TimestampTool.vue frontend/src/tools/HashTool.vue frontend/src/tools/JwtTool.vue
git commit -m "feat: add first developer tools"
```

---

## Task 5: Add backend update checker and tests

**Files:**
- Create: `update.go`
- Create: `update_test.go`

- [ ] **Step 1: Write Go tests first**

Create `update_test.go`:

```go
package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNormalizeVersion(t *testing.T) {
	if got := normalizeVersion("v1.2.3"); got != "1.2.3" {
		t.Fatalf("expected 1.2.3, got %s", got)
	}
	if got := normalizeVersion(" 1.2.3 "); got != "1.2.3" {
		t.Fatalf("expected 1.2.3, got %s", got)
	}
}

func TestCompareVersions(t *testing.T) {
	tests := []struct {
		name string
		left string
		right string
		want int
	}{
		{name: "newer patch", left: "1.2.4", right: "1.2.3", want: 1},
		{name: "older minor", left: "1.1.0", right: "1.2.0", want: -1},
		{name: "same", left: "v1.2.3", right: "1.2.3", want: 0},
		{name: "missing patch", left: "1.2", right: "1.2.0", want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := compareVersions(tt.left, tt.right)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("expected %d, got %d", tt.want, got)
			}
		})
	}
}

func TestFindPlatformAsset(t *testing.T) {
	release := githubRelease{
		Assets: []githubReleaseAsset{
			{Name: "AhuTools-windows-amd64-installer.exe", BrowserDownloadURL: "https://example.com/win.exe", Size: 10},
			{Name: "AhuTools-darwin-arm64.dmg", BrowserDownloadURL: "https://example.com/mac.dmg", Size: 20},
		},
	}

	asset, ok := findPlatformAsset(release, "darwin", "arm64")
	if !ok {
		t.Fatal("expected darwin arm64 asset")
	}
	if asset.Name != "AhuTools-darwin-arm64.dmg" {
		t.Fatalf("unexpected asset: %s", asset.Name)
	}
}

func TestFindPlatformAssetNoMatch(t *testing.T) {
	release := githubRelease{Assets: []githubReleaseAsset{{Name: "AhuTools-windows-amd64-installer.exe"}}}
	_, ok := findPlatformAsset(release, "linux", "amd64")
	if ok {
		t.Fatal("expected no matching linux asset")
	}
}

func TestCheckForUpdateFromEndpointNewVersion(t *testing.T) {
	published := time.Date(2026, 5, 8, 10, 0, 0, 0, time.UTC)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"tag_name":"v1.2.0",
			"name":"AhuTools v1.2.0",
			"html_url":"https://github.com/sreio/ahu_tools/releases/tag/v1.2.0",
			"published_at":"` + published.Format(time.RFC3339) + `",
			"body":"Release notes",
			"draft":false,
			"prerelease":false,
			"assets":[{"name":"AhuTools-darwin-arm64.dmg","browser_download_url":"https://example.com/AhuTools.dmg","size":1024}]
		}`))
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if !info.Success {
		t.Fatalf("expected success, got error %s", info.Error)
	}
	if !info.HasUpdate {
		t.Fatal("expected update")
	}
	if info.LatestVersion != "1.2.0" {
		t.Fatalf("expected latest version 1.2.0, got %s", info.LatestVersion)
	}
	if info.Asset == nil || info.Asset.Name != "AhuTools-darwin-arm64.dmg" {
		t.Fatalf("expected matched asset, got %#v", info.Asset)
	}
}

func TestCheckForUpdateFromEndpointNoUpdate(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"tag_name":"v1.0.0","draft":false,"prerelease":false,"assets":[]}`))
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if !info.Success {
		t.Fatalf("expected success, got error %s", info.Error)
	}
	if info.HasUpdate {
		t.Fatal("expected no update")
	}
	if info.Message != "当前已是最新版本" {
		t.Fatalf("unexpected message: %s", info.Message)
	}
}

func TestCheckForUpdateFromEndpointAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "rate limited", http.StatusForbidden)
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if info.Success {
		t.Fatal("expected failure")
	}
	if info.Error != "GitHub API 返回异常，请稍后重试" {
		t.Fatalf("unexpected error: %s", info.Error)
	}
}

func TestCheckForUpdateFromEndpointInvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`not-json`))
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if info.Success {
		t.Fatal("expected failure")
	}
	if info.Error != "Release 信息解析失败，请稍后重试" {
		t.Fatalf("unexpected error: %s", info.Error)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail before implementation**

Run:

```bash
go test ./...
```

Expected: FAIL because update structs/helpers do not exist yet.

- [ ] **Step 3: Implement update backend**

Create `update.go`:

```go
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const githubLatestReleaseURL = "https://api.github.com/repos/sreio/ahu_tools/releases/latest"

type DownloadAsset struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Size int64  `json:"size"`
}

type UpdateInfo struct {
	Success          bool           `json:"success"`
	HasUpdate        bool           `json:"hasUpdate"`
	CurrentVersion   string         `json:"currentVersion"`
	LatestVersion    string         `json:"latestVersion,omitempty"`
	ReleaseName      string         `json:"releaseName,omitempty"`
	ReleaseURL       string         `json:"releaseUrl,omitempty"`
	ReleaseNotes     string         `json:"releaseNotes,omitempty"`
	PublishedAt      string         `json:"publishedAt,omitempty"`
	Asset            *DownloadAsset `json:"asset,omitempty"`
	Platform         string         `json:"platform"`
	Message          string         `json:"message,omitempty"`
	Error            string         `json:"error,omitempty"`
	PlatformHasAsset bool           `json:"platformHasAsset"`
}

type DownloadUpdateResponse struct {
	Success   bool   `json:"success"`
	Cancelled bool   `json:"cancelled"`
	Path      string `json:"path,omitempty"`
	Message   string `json:"message,omitempty"`
	Error     string `json:"error,omitempty"`
}

type githubRelease struct {
	TagName     string               `json:"tag_name"`
	Name        string               `json:"name"`
	HTMLURL     string               `json:"html_url"`
	PublishedAt string               `json:"published_at"`
	Body        string               `json:"body"`
	Draft       bool                 `json:"draft"`
	Prerelease  bool                 `json:"prerelease"`
	Assets      []githubReleaseAsset `json:"assets"`
}

type githubReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

func (a *App) CheckForUpdate() UpdateInfo {
	return checkForUpdateFromEndpoint(githubLatestReleaseURL, Version, runtime.GOOS, runtime.GOARCH)
}

func (a *App) DownloadUpdate(asset DownloadAsset) DownloadUpdateResponse {
	if a.ctx == nil {
		return DownloadUpdateResponse{Success: false, Error: "应用尚未初始化完成，请稍后重试"}
	}
	if strings.TrimSpace(asset.URL) == "" || strings.TrimSpace(asset.Name) == "" {
		return DownloadUpdateResponse{Success: false, Error: "下载资源信息不完整，请重新检查更新"}
	}

	path, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		DefaultFilename: asset.Name,
		Title:           "保存更新安装包",
	})
	if err != nil {
		return DownloadUpdateResponse{Success: false, Error: "打开保存对话框失败，请稍后重试"}
	}
	if path == "" {
		return DownloadUpdateResponse{Success: false, Cancelled: true, Message: "已取消保存"}
	}

	if err := downloadFile(asset.URL, path); err != nil {
		return DownloadUpdateResponse{Success: false, Error: "下载安装包失败，请稍后重试"}
	}

	return DownloadUpdateResponse{Success: true, Path: path, Message: "下载完成"}
}

func checkForUpdateFromEndpoint(endpoint string, currentVersion string, goos string, goarch string) UpdateInfo {
	info := UpdateInfo{
		Success:        false,
		CurrentVersion: normalizeVersion(currentVersion),
		Platform:       goos + "/" + goarch,
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(endpoint)
	if err != nil {
		info.Error = "网络连接失败，请检查网络后重试"
		return info
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		info.Error = "GitHub API 返回异常，请稍后重试"
		return info
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		info.Error = "Release 信息解析失败，请稍后重试"
		return info
	}

	if release.Draft || release.Prerelease {
		info.Error = "当前没有可用的正式 Release"
		return info
	}

	latestVersion := normalizeVersion(release.TagName)
	comparison, err := compareVersions(latestVersion, currentVersion)
	if err != nil {
		info.Error = "版本号格式无法识别，请稍后重试"
		return info
	}

	info.Success = true
	info.LatestVersion = latestVersion
	info.ReleaseName = release.Name
	info.ReleaseURL = release.HTMLURL
	info.ReleaseNotes = release.Body
	info.PublishedAt = release.PublishedAt

	if comparison <= 0 {
		info.HasUpdate = false
		info.Message = "当前已是最新版本"
		return info
	}

	info.HasUpdate = true
	asset, ok := findPlatformAsset(release, goos, goarch)
	if !ok {
		info.PlatformHasAsset = false
		info.Message = "发现新版本，但当前平台没有匹配的安装包或可执行产物"
		return info
	}

	info.PlatformHasAsset = true
	info.Asset = &DownloadAsset{Name: asset.Name, URL: asset.BrowserDownloadURL, Size: asset.Size}
	info.Message = "发现新版本"
	return info
}

func normalizeVersion(version string) string {
	version = strings.TrimSpace(version)
	version = strings.TrimPrefix(version, "v")
	version = strings.TrimPrefix(version, "V")
	return version
}

func compareVersions(left string, right string) (int, error) {
	leftParts, err := parseVersionParts(left)
	if err != nil {
		return 0, err
	}
	rightParts, err := parseVersionParts(right)
	if err != nil {
		return 0, err
	}

	for i := 0; i < 3; i++ {
		if leftParts[i] > rightParts[i] {
			return 1, nil
		}
		if leftParts[i] < rightParts[i] {
			return -1, nil
		}
	}
	return 0, nil
}

func parseVersionParts(version string) ([3]int, error) {
	var result [3]int
	parts := strings.Split(normalizeVersion(version), ".")
	if len(parts) > 3 || len(parts) == 0 {
		return result, errors.New("invalid version")
	}

	for i, part := range parts {
		if part == "" {
			return result, errors.New("invalid version")
		}
		value, err := strconv.Atoi(part)
		if err != nil {
			return result, err
		}
		result[i] = value
	}

	return result, nil
}

func findPlatformAsset(release githubRelease, goos string, goarch string) (githubReleaseAsset, bool) {
	platform := goos + "-" + goarch
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if !strings.Contains(name, platform) {
			continue
		}
		if goos == "windows" && strings.HasSuffix(name, ".exe") {
			return asset, true
		}
		if goos == "darwin" && (strings.HasSuffix(name, ".dmg") || strings.HasSuffix(name, ".zip")) {
			return asset, true
		}
	}
	return githubReleaseAsset{}, false
}

func downloadFile(url string, path string) error {
	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	return err
}
```

- [ ] **Step 4: Format Go files**

Run:

```bash
gofmt -w update.go update_test.go
```

- [ ] **Step 5: Verify Go tests pass**

Run:

```bash
go test ./...
```

Expected: PASS.

- [ ] **Step 6: Regenerate Wails bindings**

Run:

```bash
wails generate module
```

Expected: `frontend/wailsjs/go/main/App.d.ts` and `frontend/wailsjs/go/main/App.js` include `CheckForUpdate` and `DownloadUpdate`.

If `wails generate module` is unavailable in the local environment, run:

```bash
wails build
```

Expected: Wails build regenerates bindings before frontend build. If Wails CLI is unavailable, stop and report that Wails binding generation could not be verified locally.

- [ ] **Step 7: Optional commit checkpoint**

Only if commit authorization exists:

```bash
git add update.go update_test.go frontend/wailsjs/go/main/App.d.ts frontend/wailsjs/go/main/App.js
git commit -m "feat: add GitHub release update backend"
```

---

## Task 6: Add update tool frontend

**Files:**
- Create: `frontend/src/tools/UpdateTool.vue`

- [ ] **Step 1: Create update tool component**

Create `frontend/src/tools/UpdateTool.vue`:

```vue
<template>
  <section class="tool-card">
    <div class="tool-header">
      <div>
        <h2>应用更新</h2>
        <p>从 GitHub Release 检查最新版本，并下载当前平台安装包/可执行产物。</p>
      </div>
      <button class="btn primary" :disabled="checking" @click="checkUpdate">
        {{ checking ? '检查中...' : '检查更新' }}
      </button>
    </div>

    <div v-if="error" class="error-box">{{ error }}</div>
    <div v-if="message" class="notice-box">{{ message }}</div>

    <div v-if="info" class="result-card update-info">
      <p><strong>当前版本：</strong>{{ info.currentVersion }}</p>
      <p v-if="info.latestVersion"><strong>最新版本：</strong>{{ info.latestVersion }}</p>
      <p><strong>当前平台：</strong>{{ info.platform }}</p>
      <p v-if="info.publishedAt"><strong>发布时间：</strong>{{ info.publishedAt }}</p>
      <p v-if="info.releaseUrl"><strong>Release：</strong><a :href="info.releaseUrl" target="_blank">{{ info.releaseName || info.releaseUrl }}</a></p>

      <div v-if="info.releaseNotes" class="release-notes">
        <h3>Release Notes</h3>
        <pre>{{ info.releaseNotes }}</pre>
      </div>

      <div v-if="info.asset" class="asset-card">
        <p><strong>当前平台产物：</strong>{{ info.asset.name }}</p>
        <p><strong>大小：</strong>{{ formatSize(info.asset.size) }}</p>
        <button class="btn primary" :disabled="downloading" @click="downloadUpdate">
          {{ downloading ? '下载中...' : '下载到本地' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { CheckForUpdate, DownloadUpdate } from '../services/wailsApi'

export default {
  name: 'UpdateTool',
  emits: ['toast'],
  data() {
    return {
      checking: false,
      downloading: false,
      info: null,
      error: '',
      message: '',
    }
  },
  methods: {
    async checkUpdate() {
      this.checking = true
      this.error = ''
      this.message = ''
      this.info = null

      try {
        const info = await CheckForUpdate()
        this.info = info
        if (info.success) {
          this.message = info.message || ''
        } else {
          this.error = info.error || '检查更新失败'
        }
      } catch {
        this.error = '调用更新服务失败，请稍后重试'
      } finally {
        this.checking = false
      }
    },
    async downloadUpdate() {
      if (!this.info?.asset) return

      this.downloading = true
      this.error = ''
      try {
        const response = await DownloadUpdate(this.info.asset)
        if (response.success) {
          this.$emit('toast', { message: response.message || '下载完成', type: 'success' })
        } else if (response.cancelled) {
          this.message = response.message || '已取消保存'
        } else {
          this.error = response.error || '下载失败'
        }
      } catch {
        this.error = '调用下载服务失败，请稍后重试'
      } finally {
        this.downloading = false
      }
    },
    formatSize(size) {
      if (!size) return '未知'
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      return `${(size / 1024 / 1024).toFixed(1)} MB`
    },
  },
}
</script>
```

- [ ] **Step 2: Verify Wails API wrapper has update exports**

Run:

```bash
grep -R "CheckForUpdate\|DownloadUpdate" frontend/wailsjs/go/main frontend/src/services/wailsApi.js
```

Expected: generated Wails files and `wailsApi.js` contain both methods.

- [ ] **Step 3: Run frontend tests**

Run:

```bash
npm run test --prefix frontend
```

Expected: PASS.

- [ ] **Step 4: Run frontend build**

Run:

```bash
npm run build --prefix frontend
```

Expected: PASS. If build fails because Wails bindings are missing, return to Task 5 Step 6.

- [ ] **Step 5: Optional commit checkpoint**

Only if commit authorization exists:

```bash
git add frontend/src/tools/UpdateTool.vue frontend/src/services/wailsApi.js frontend/wailsjs/go/main/App.d.ts frontend/wailsjs/go/main/App.js
git commit -m "feat: add update check UI"
```

---

## Task 7: Upgrade GitHub Release workflow artifacts

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Update release workflow**

Replace `.github/workflows/release.yml` with a workflow that:

- Uses Go `1.22.x`.
- Installs Wails CLI `v2.11.0`.
- Builds Windows AMD64 installer via `wails build -platform windows/amd64 -nsis`.
- Builds macOS app bundles for AMD64 and ARM64.
- Packages macOS as `.dmg` when `create-dmg` succeeds.
- Uploads stable asset names used by update matching.

Use this workflow content:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build:
    name: Build ${{ matrix.name }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - name: Windows AMD64
            platform: windows/amd64
            goos: windows
            goarch: amd64
            os: windows-latest
            artifact-name: AhuTools-windows-amd64-installer.exe
          - name: macOS AMD64
            platform: darwin/amd64
            goos: darwin
            goarch: amd64
            os: macos-latest
            artifact-name: AhuTools-darwin-amd64.dmg
          - name: macOS ARM64
            platform: darwin/arm64
            goos: darwin
            goarch: arm64
            os: macos-latest
            artifact-name: AhuTools-darwin-arm64.dmg

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22.x'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        run: npm ci --prefix frontend

      - name: Install Wails
        run: go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0

      - name: Install Linux dependencies
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev

      - name: Install create-dmg
        if: runner.os == 'macOS'
        run: brew install create-dmg

      - name: Build Windows installer
        if: runner.os == 'Windows'
        shell: pwsh
        run: |
          wails build -platform ${{ matrix.platform }} -nsis
          $installer = Get-ChildItem -Path build/bin -Recurse -Filter "*.exe" | Select-Object -First 1
          if (-not $installer) { throw "Windows installer not found" }
          Copy-Item $installer.FullName "${{ matrix.artifact-name }}"

      - name: Build macOS app
        if: runner.os == 'macOS'
        run: |
          wails build -platform ${{ matrix.platform }}
          APP_PATH=$(find build/bin -maxdepth 1 -name "*.app" -print -quit)
          if [ -z "$APP_PATH" ]; then
            echo "macOS app bundle not found"
            exit 1
          fi
          create-dmg \
            --volname "AhuTools" \
            --window-pos 200 120 \
            --window-size 600 400 \
            --icon-size 100 \
            --app-drop-link 450 185 \
            "${{ matrix.artifact-name }}" \
            "$APP_PATH"

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact-name }}
          path: ${{ matrix.artifact-name }}
          if-no-files-found: error

  release:
    name: Create GitHub Release
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts
          merge-multiple: true

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: artifacts/*
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Validate workflow syntax locally if tooling exists**

Run:

```bash
git diff --check .github/workflows/release.yml
```

Expected: no whitespace errors.

Optional if `actionlint` exists:

```bash
actionlint .github/workflows/release.yml
```

Expected: PASS. If `actionlint` is not installed, state that workflow syntax was not fully validated locally.

- [ ] **Step 3: Ensure asset names match backend matcher**

Run:

```bash
grep -n "AhuTools-windows-amd64-installer.exe\|AhuTools-darwin-amd64.dmg\|AhuTools-darwin-arm64.dmg" .github/workflows/release.yml update_test.go
```

Expected: workflow and Go tests both reference stable platform names.

- [ ] **Step 4: Optional commit checkpoint**

Only if commit authorization exists:

```bash
git add .github/workflows/release.yml
git commit -m "ci: publish installer release assets"
```

---

## Task 8: Final verification and acceptance check

**Files:**
- All changed files from prior tasks.

- [ ] **Step 1: Run Go tests**

Run:

```bash
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend utility tests**

Run:

```bash
npm run test --prefix frontend
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run:

```bash
npm run build --prefix frontend
```

Expected: PASS.

- [ ] **Step 4: Run optional Wails build when local CLI/dependencies allow**

Run:

```bash
wails build
```

Expected: PASS and app builds. If Wails CLI or native dependencies are missing, report the exact blocker and do not claim Wails build passed.

- [ ] **Step 5: Manual UI verification**

Start the dev app:

```bash
wails dev
```

Verify manually:

- Left sidebar renders app name/version and tool groups.
- 数据解密 tool still decrypts known valid input with an existing environment config.
- JSON tool formats valid JSON and shows invalid JSON error.
- Base64 tool encodes/decodes UTF-8 Chinese text and rejects invalid Base64.
- URL tool encodes/decodes and rejects malformed URI.
- 时间戳 tool converts seconds/milliseconds and rejects invalid input.
- Hash tool computes SHA-256 output.
- JWT tool decodes header/payload and visibly shows “仅 decode，不校验签名”.
- 应用更新 tool shows current/latest version or safe error message.
- Download button opens native save dialog when a matching asset exists.

- [ ] **Step 6: Acceptance criteria checklist**

Confirm each design acceptance criterion from `docs/superpowers/specs/2026-05-08-developer-tools-updates-design.md`:

- [ ] 用户可以通过左侧工具栏在各工具间切换。
- [ ] 现有数据解密功能仍可正常使用。
- [ ] JSON/Base64/URL/时间戳/Hash/JWT 工具可处理成功和失败输入。
- [ ] JWT 工具明确提示“不校验签名”。
- [ ] 用户可以检查 GitHub Release 最新版本。
- [ ] 有新版本时展示版本、release notes 和当前平台安装包/可执行产物信息。
- [ ] 用户可以通过 native save dialog 下载当前平台 release asset。
- [ ] 无新版本、网络失败、无平台安装包/可执行产物、用户取消下载时有清晰提示。
- [ ] 新增 frontend utility tests 和 Go update checker tests。
- [ ] `go test ./...`、`npm run test --prefix frontend`、`npm run build --prefix frontend` 通过。

- [ ] **Step 7: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: changed files match the planned files; no unrelated local files are included.

- [ ] **Step 8: Optional final commit**

Only if commit authorization exists:

```bash
git add .github/workflows/release.yml update.go update_test.go frontend/package.json frontend/package-lock.json frontend/src frontend/wailsjs/go/main/App.d.ts frontend/wailsjs/go/main/App.js
git commit -m "feat: add developer tools and in-app updates"
```

---

## Self-Review

### Spec coverage

- UI shell with left sidebar: Task 2 and Task 3.
- Existing decrypt retained: Task 3.
- JSON/Base64/URL/timestamp/Hash/JWT tools: Task 1 and Task 4.
- JWT no-signature-verification warning: Task 4 Step 6 and Task 8 Step 6.
- GitHub Release update check/download: Task 5 and Task 6.
- Semver normalization/comparison: Task 5 tests and implementation.
- Platform installer/executable-style asset matching: Task 5 and Task 7.
- Native save dialog download: Task 5 `DownloadUpdate`.
- Release workflow installer/dmg upgrade: Task 7.
- Frontend and Go tests: Task 1 and Task 5.
- Verification commands: Task 8.

### Placeholder scan

No `TBD`, `TODO`, or “implement later” placeholders are intentionally present. Optional commands are explicitly marked optional and have concrete behavior.

### Type consistency

- Frontend update UI expects `UpdateInfo.asset` with `name`, `url`, and `size`, matching Go `DownloadAsset` JSON fields.
- Frontend calls `CheckForUpdate()` and `DownloadUpdate(asset)`, matching Go public `App` methods.
- Registry keys are stable strings consumed by `App.vue` `activeTool`.
- Utility functions all return `{ ok: true, value }` or `{ ok: false, error }` as required by the design spec.
