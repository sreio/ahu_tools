# Add Developer Tools and In-App Updates

## Goal

在现有 AhuTools Wails desktop app 中增加一个可扩展的开发小工具平台，并支持应用内检查 GitHub Release 更新。第一版重点做高频、低风险的小工具集合，同时为后续接口调试、数据库/SQL 工具等能力预留扩展空间。

## What I already know

* 用户希望新增：1) 开发小工具；2) 应用内更新。
* 开发小工具希望“都要但分期”，先做平台和 MVP，再逐步扩展。
* 第一版 MVP 工具选择“推荐组合”：JSON 格式化/压缩、Base64 编解码、URL 编解码、时间戳转换、Hash 计算。
* 应用内更新第一版使用 GitHub Release 作为版本和下载来源。
* 当前 GitHub Action 只发布 zip 压缩包；本任务需要同步升级 release 产物，让 Windows/macOS 提供更像可执行软件/安装包的下载。
* 当前项目是 Wails v2 + Go + Vue 3 + Vite desktop app。
* 当前 release workflow 在 `.github/workflows/release.yml` 中通过 tag `v*` 触发，构建 Windows/macOS zip，并用 `softprops/action-gh-release` 发布 GitHub Release。
* 当前 frontend 主逻辑集中在 `frontend/src/App.vue`。
* 当前 backend Wails methods 在 `App` 上暴露，Go files 位于 repository root。

## Assumptions (temporary)

* 第一版开发工具入口会集成到现有应用 UI 中，而不是单独新建 app。
* 第一版应用内更新需要检查版本、展示 release notes，并在应用内下载当前平台安装包/可执行产物；不做自动安装或自动重启。
* Linux release 当前 README 提到支持，但 GitHub Actions release matrix 目前只构建 Windows AMD64、macOS AMD64、macOS ARM64。

## Open Questions

* MVP 是否需要同时调整主界面导航结构，例如左侧工具栏 / tabs / 首页卡片？
* 应用内更新第一版是否只提示并打开浏览器下载，还是要在 app 内下载 zip？
* GitHub Release repo URL 是否就是当前仓库远端，还是需要配置为固定项目地址？

## Requirements (evolving)

* 新增开发小工具平台，支持后续分期扩展更多工具。
* 第一版 UI 采用左侧工具栏：左侧分组导航，右侧显示当前工具。
* 第一版内置：JSON 格式化/压缩、Base64 编解码、URL 编解码、时间戳转换、Hash 计算、JWT decode。
* 新增应用内更新检查，数据来源为 GitHub Release。
* 文档、UI 文案优先使用简体中文；代码、API、技术名词按惯例使用英文。

## Acceptance Criteria (evolving)

* [ ] 用户可以在应用中进入“开发工具”区域。
* [ ] 用户可以使用 JSON 格式化/压缩工具处理输入文本。
* [ ] 用户可以使用 Base64 encode/decode。
* [ ] 用户可以使用 URL encode/decode。
* [ ] 用户可以进行时间戳和日期时间互转。
* [ ] 用户可以计算常用 Hash。
* [ ] 用户可以 decode JWT，并查看 header 和 payload。
* [ ] JWT 工具明确提示第一版不做签名校验。
* [ ] 用户可以在应用中检查 GitHub Release 最新版本。
* [ ] 有新版本时展示版本号、release notes 和当前平台安装包/可执行产物下载入口。
* [ ] 网络失败或没有新版本时有清晰提示。

## Definition of Done (team quality bar)

* Tests added/updated where practical for pure utility functions.
* Go compile/test command passes.
* Frontend build passes.
* Docs/spec updated if new conventions are introduced.
* Network failure、版本比较、平台下载选择等风险已考虑。

## Scope Decision

MVP 选择 “2 + 3”：第一版同时兼顾健壮性和扩展性。

* 健壮性：GitHub Release 检查需要处理网络失败、无新版本、无匹配平台安装包/可执行产物、release API 异常等情况；工具输入错误需要给出清晰提示。
* 扩展性：开发工具平台需要有工具分组/注册结构和组件拆分，方便后续加入 HTTP 调试、SQL/数据库工具、JWT/AES/RSA 等工具。

## Out of Scope (explicit)

* 第一版不做接口调试完整 Postman-like 功能。
* 第一版不做数据库连接管理或 SQL 查询执行。
* 第一版 JWT 工具只做 decode 和展示，不做签名校验、签名生成或 token 安全判定。
* 第一版不实现真正的插件系统或动态加载第三方工具。
* 第一版不改变现有解密配置数据结构，除非后续设计确认需要。

## Technical Notes

* `README.md` documents current app as AES-128-CBC decrypt tool with multi-environment config.
* `.github/workflows/release.yml` currently creates GitHub Releases from `v*` tags and uploads platform zip artifacts only; this task should upgrade release assets so Windows/macOS users can download installer/executable-style packages.
* `frontend/src/App.vue` is currently the main UI container and likely needs navigation changes or component extraction.
* Current UI has one decrypt form, one settings modal, toast handling, app metadata loading, and config loading in a single Options API component.
* `main.go` defines `Version = "1.0.0"`, `AppName = "AhuTools"`, and `Author = "zhichi"`; `app.go` exposes these through Wails methods.
* `frontend/package.json` only has `dev`, `build`, and `preview` scripts.
* Backend methods should follow existing Wails binding style on `App`.
