# Directory Structure

> 本项目 backend 代码的组织方式。

---

## Overview

本项目是 Wails v2 desktop application，不是传统 HTTP API backend。这里的 backend 是运行在 Wails runtime 中、通过 generated Wails bridge code 被 Vue frontend 调用的 Go 层。

当前 backend code 是扁平结构：

- Go files 位于 repository root。
- 当前所有 Go backend files 都使用 `package main`。
- 当前没有 `cmd/`、`internal/`、`pkg/`、`controllers/`、`handlers/`、`middleware/`、`repositories/` 等 backend 目录。
- Frontend/backend communication 通过 Wails bindings 完成，不通过 REST routes。

---

## Directory Layout

```text
ahu_tools/
├── main.go                  # Wails entrypoint and app binding
├── app.go                   # App lifecycle and metadata methods
├── service.go               # Config model, GORM/SQLite service, config methods
├── decrypt.go               # Decrypt request/response DTOs and AES-CBC crypto logic
├── go.mod                   # Go module and backend dependencies
├── go.sum                   # Go dependency lock file
├── wails.json               # Wails project configuration
├── Makefile                 # Common development/build commands
├── build.sh                 # Shell build helper
├── frontend/
│   ├── package.json         # Vue/Vite scripts and dependencies
│   ├── src/
│   │   ├── main.js          # Vue app entrypoint
│   │   ├── App.vue          # Main UI and Wails bridge calls
│   │   └── style.css        # Global frontend styles
│   ├── wailsjs/             # Wails-generated frontend bridge/runtime
│   └── dist/                # Frontend build output embedded by Go
└── .trellis/
    ├── spec/backend/        # Project-specific backend guidelines
    ├── spec/guides/         # Shared thinking guides
    └── tasks/               # Trellis task state
```

---

## Key Backend Files

- `main.go`
  - Wails desktop app entrypoint。
  - 使用 `//go:embed` 嵌入 `frontend/dist`。
  - 调用 `wails.Run(...)`。
  - 通过 `Bind: []interface{}{app}` 绑定 `App` instance，让 frontend code 能调用 Go methods。

- `app.go`
  - 定义 `App` 及其 startup lifecycle。
  - 保存 Wails `context.Context`。
  - 在 `startup(ctx)` 中初始化 `DecryptService`。
  - 暴露 metadata methods，例如 `GetVersion`、`GetAppName`、`GetAuthor`。

- `service.go`
  - 定义包含 `Environment`、`Key`、`Description` 字段的 `Config` GORM model。
  - 定义 `DecryptService`，并持有 `*gorm.DB` connection。
  - 打开本地 SQLite database，并运行 `AutoMigrate(&Config{})`。
  - 在缺失时 seed 默认 `test` 和 `production` configs。
  - 实现 configuration CRUD，例如 `GetConfig`、`GetAllConfigs`、`SaveConfig`、`DeleteConfig`。
  - 在 `*App` 上暴露 Wails-facing config methods。

- `decrypt.go`
  - 定义 `DecryptRequest` 和 `DecryptResponse`。
  - 实现 Wails-facing `App.Decrypt(...)` method。
  - 包含 AES-CBC decrypt helpers、IV-prefix handling、Base64 ciphertext decoding 和 PKCS7 unpadding logic。

---

## Frontend Boundary

Vue frontend 通过 Wails-generated bindings 调用 backend methods。例如 `frontend/src/App.vue` 从 `../wailsjs/go/main/App` 导入 `Decrypt`、`GetAllConfigs`、`SaveConfig`、`GetVersion`、`GetAppName`、`GetAuthor`。

请把 Wails methods 视为 backend API boundary。除非项目实际引入 HTTP server，否则不要描述或实现 HTTP route/controller patterns。

---

## Module Organization

小型 backend 增量改动优先遵循当前 root-level `package main` 约定，按职责放在现有文件附近：

- App lifecycle 和 metadata：`app.go`
- Wails startup/binding/window setup：`main.go`
- Config persistence 和 SQLite/GORM access：`service.go`
- Decrypt request/response 和 crypto behavior：`decrypt.go`

如果 backend 规模明显增长，未来可以考虑拆分为更聚焦的 packages，但这不是当前项目约定。

---

## Naming Conventions

- Go exported types 和 Wails-callable methods 使用 PascalCase，例如 `App`、`DecryptService`、`Config`、`Decrypt`、`SaveConfig`。
- Internal helper functions 使用 lower camel case，例如 `decrypt`、`createIV`、`pkcs7Unpad`。
- JSON fields 使用 lower camel case，例如 `isJson`、`environment`。
- Frontend files 当前遵循 `frontend/src/` 下的 Vue/Vite conventions。

---

## Anti-patterns

- 不要把 `controllers/`、`middleware/`、`repositories/`、`api/`、`internal/` 等目录约定描述成当前已存在的结构。
- 不要把 Wails calls 建模成 REST endpoints 或 HTTP status-code responses。
- 不要随意把文件拆成新 package；Wails binding names 和 generated frontend bridge code 依赖 Go package/type/method names。
- 不要把 backend rules 或 Go implementation code 放到 `frontend/` 下。
- 不要假设 `frontend/dist` 或 `frontend/wailsjs` 是手写 source files；它们是 Wails 使用的 generated/build outputs。
