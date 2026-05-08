# Developer Tools and In-App Updates Design

## Goal

把 AhuTools 从单一“数据解密工具”扩展为一个可持续扩展的开发者工具箱，并加入基于 GitHub Release 的应用内更新检查与下载能力。

## Background

当前项目是 Wails v2 + Go + Vue 3 + Vite desktop app。现有 UI 主要集中在 `frontend/src/App.vue`，backend public methods 通过 `main.go` 中的 `Bind: []interface{}{app}` 暴露给 frontend。Release workflow 通过 tag `v*` 创建 GitHub Release，但当前只上传 Windows/macOS zip artifacts，不提供更明确的 installer/executable-style 下载产物。

第一版目标不是一次性做完整工具平台或自动安装器，而是建立清晰的工具扩展结构，交付高频开发小工具，升级 GitHub Release 产物，并支持安全、可控地下载当前平台安装包/可执行产物。

## Requirements

### UI Shell

- 使用左侧工具栏作为主导航。
- 右侧显示当前选中的工具内容。
- 现有数据解密功能保留，并作为一个工具入口。
- 新增“应用更新”工具/页面。
- UI 文案使用简体中文；代码、API、命令、文件路径和常用技术名词可保留英文。

### First-Version Tools

第一版内置工具：

- 数据解密：保留现有 AES-CBC 解密能力。
- JSON：格式化、压缩、错误提示、复制输出。
- Base64：UTF-8 text encode/decode，非法输入提示。
- URL：encode/decode，malformed URI 提示。
- 时间戳转换：秒/毫秒 timestamp 与本地日期时间互转。
- Hash：计算常用 SHA hash。
- JWT decode：decode 并展示 header 和 payload；明确提示不做签名校验。

### In-App Updates

- 从 GitHub Release 检查最新版本。
- 归一化 `v1.2.3` / `1.2.3` 后做语义版本比较。
- 匹配当前平台 installer/executable-style release asset。
- 展示最新版本、release notes、发布时间、当前平台安装包/可执行产物状态。
- 点击下载时弹出 native save dialog，让用户选择保存路径和文件名。
- 下载当前平台安装包/可执行产物到用户选择的位置。
- 处理网络失败、GitHub API 异常、无新版本、无匹配平台包、用户取消保存、下载失败。
- 不做自动安装、自动替换当前 app、自动重启或后台下载队列。

## Architecture

### Frontend Structure

不引入 Vue Router、Pinia 或 UI component library。采用轻量组件化：

- `frontend/src/App.vue`
  - App shell。
  - 管理 `activeTool`、app info、configs、toast、settings modal。
  - 渲染 `SidebarNav` 和当前工具组件。

- `frontend/src/components/SidebarNav.vue`
  - 左侧导航。
  - 展示应用名、版本、工具分组、设置入口。

- `frontend/src/components/ConfigModal.vue`
  - 从现有 `App.vue` 拆出环境配置弹窗。

- `frontend/src/components/ToastMessage.vue`
  - 从现有 `App.vue` 拆出 toast。

- `frontend/src/tools/index.js`
  - 工具注册表。
  - 每个工具定义 `key`、`name`、`group`、`description`、`component`。

- `frontend/src/services/wailsApi.js`
  - 统一封装 `../wailsjs/go/main/App` imports。
  - 避免各组件直接依赖 Wails generated path。

### Tool Components

- `frontend/src/tools/DecryptTool.vue`
- `frontend/src/tools/JsonTool.vue`
- `frontend/src/tools/Base64Tool.vue`
- `frontend/src/tools/UrlTool.vue`
- `frontend/src/tools/TimestampTool.vue`
- `frontend/src/tools/HashTool.vue`
- `frontend/src/tools/JwtTool.vue`
- `frontend/src/tools/UpdateTool.vue`

每个工具组件只负责本工具的 input、action、output 和局部 error state。跨工具通用提示通过 parent shell 的 toast 处理。

### Utility Functions

新增 `frontend/src/utils/devTools.js`，放可测试的纯函数：

- `formatJson(input)`
- `minifyJson(input)`
- `encodeBase64(input)`
- `decodeBase64(input)`
- `encodeUrl(input)`
- `decodeUrl(input)`
- `timestampToDate(input)`
- `dateToTimestamp(input)`
- `hashText(input, algorithm)`
- `decodeJwt(input)`

纯函数统一返回 result shape：

```js
{ ok: true, value }
{ ok: false, error }
```

这样 Vue components 不需要散落重复的 `try/catch` 和错误文案判断。

### Update Backend

新增 `update.go`，继续通过 public `App` methods 暴露给 Wails frontend：

- `CheckForUpdate() UpdateInfo`
- `DownloadUpdate(asset DownloadAsset) DownloadUpdateResponse`

`CheckForUpdate` 负责：

- 请求 GitHub latest release。
- 解析 `tag_name`、`html_url`、`name`、`published_at`、`body`、`assets`。
- 忽略 draft，第一版不支持 prerelease。
- 归一化版本并比较。
- 根据 `runtime.GOOS` / `runtime.GOARCH` 匹配当前平台 asset。
- 返回 UI 安全的状态和错误信息。

`DownloadUpdate` 负责：

- 使用 `runtime.SaveFileDialog` 获取保存路径。
- 用户取消时返回 `cancelled` 状态。
- 使用 `net/http` 下载安装包/可执行产物。
- 写入用户选择路径。
- 返回成功路径或安全错误信息。

### Release Workflow

为提高更新检查和下载体验，同步调整 `.github/workflows/release.yml`：

- Go version 与 `go.mod` 保持一致，使用 Go 1.22.x。
- Wails CLI 固定到 `v2.11.0`，避免 `latest` 漂移。
- Windows 使用 Wails NSIS installer（`wails build -nsis`）产出 installer `.exe`，并作为 Release asset 上传。
- macOS 产出可分发的 `.app` bundle，并打包为 `.dmg` 或明确命名的 macOS app archive；推荐 `.dmg`，因为它比普通 zip 更符合 macOS 用户下载习惯。
- Release asset 命名需要能被更新检查稳定匹配，例如 `AhuTools-windows-amd64-installer.exe`、`AhuTools-darwin-arm64.dmg`。
- 当前不新增 Linux artifacts；Linux 发布支持作为后续任务处理。

## Error Handling

### Tool Input Errors

- JSON invalid、Base64 invalid、URL decode invalid、timestamp invalid、JWT 格式错误都在工具内展示明确错误。
- JWT 工具必须显示“仅 decode，不校验签名”的提示，避免用户误以为 token 可信。

### Update Errors

应用内更新需要区分：

- 当前已是最新版本。
- 网络连接失败。
- GitHub API 返回非 200。
- Release JSON 无法解析。
- 当前平台没有匹配 installer/executable-style asset。
- 用户取消保存。
- 下载失败或写入失败。

所有错误都应返回适合 UI 展示的简体中文文案，不暴露 raw stack trace 或敏感本地路径。

## Testing

### Frontend Tests

引入 Vitest，用于测试 `frontend/src/utils/devTools.js` 纯函数。

覆盖：

- JSON format/minify success and invalid JSON。
- Base64 UTF-8 中文 encode/decode and invalid decode。
- URL encode/decode and malformed URI。
- Timestamp seconds/milliseconds/date conversion and invalid input。
- Hash stable output。
- JWT valid header/payload decode and malformed token。

### Go Tests

新增 `update_test.go`，使用标准库测试，不真实请求 GitHub：

- version normalization/comparison。
- release JSON parsing。
- current platform asset matching。
- no matching asset。
- network/API error mapping via `httptest`。

### Verification Commands

- `go test ./...`
- `npm run test --prefix frontend`
- `npm run build --prefix frontend`
- 可选：`wails build`，视本机 Wails CLI 环境而定。

## Out of Scope

- 不做 Postman-like HTTP 调试完整功能。
- 不做数据库连接管理或 SQL 查询执行。
- 不做插件系统或第三方工具动态加载。
- 不做 JWT 签名校验、签名生成或 token 安全判定。
- 不做自动安装、后台替换 app、自动重启。下载得到的是用户可手动运行/安装的 release asset。
- 不做下载断点续传或后台下载队列。
- 第一版不支持 prerelease 更新。
- 第一版不新增 Linux release artifacts。

## Acceptance Criteria

- 用户可以通过左侧工具栏在各工具间切换。
- 现有数据解密功能仍可正常使用。
- JSON/Base64/URL/时间戳/Hash/JWT 工具可处理成功和失败输入。
- JWT 工具明确提示“不校验签名”。
- 用户可以检查 GitHub Release 最新版本。
- 有新版本时展示版本、release notes 和当前平台安装包/可执行产物信息。
- 用户可以通过 native save dialog 下载当前平台 release asset。
- 无新版本、网络失败、无平台安装包/可执行产物、用户取消下载时有清晰提示。
- 新增 frontend utility tests 和 Go update checker tests。
- `go test ./...`、`npm run test --prefix frontend`、`npm run build --prefix frontend` 通过。
