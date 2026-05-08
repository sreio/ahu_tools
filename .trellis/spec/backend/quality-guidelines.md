# Quality Guidelines

> Backend development 的 code quality standards。

---

## Overview

当前 quality baseline：

- Go version 在 `go.mod` 中定义为 `1.22.0`。
- Backend 是 Wails v2 Go desktop layer。
- Frontend 是 `frontend/` 下的 Vue 3 + Vite。
- `frontend/package.json` 当前只定义 `dev`、`build`、`preview` scripts。
- 当前没有 Go `*_test.go` files。
- 当前没有 frontend `*.test.*`、`*.spec.*` 或 `__tests__` files。
- 当前没有 project lint/typecheck scripts。
- Release CI 会 build artifacts，但当前没有独立的 lint/test/typecheck quality gate。

除非 repository 中实际新增，否则不要声称已有 test、lint、typecheck 或 CI quality system。

---

## Formatting Requirements

遵循 `.editorconfig`：

- UTF-8 files。
- LF line endings。
- 文件末尾保留 final newline。
- 除 Markdown 有意允许的情况外，trim trailing whitespace。
- Go files 使用 tabs，并保持 `gofmt` compatible。
- JavaScript、Vue、JSON、HTML、CSS 使用 2-space indentation。
- Makefiles 使用 tabs。

Go changes 完成前应使用 `gofmt` 格式化。

---

## Required Patterns

- 把 Wails methods 视为 backend boundary。
- 在执行 crypto、database 或 filesystem operations 前校验 Wails/user inputs。
- 除非项目明确引入新的 data-access structure，否则 database access 保持在 `DecryptService` 后面。
- 适合时通过 Wails response structs 返回 safe user-facing errors。
- 避免在 logs、error messages、debug output 中暴露 sensitive values。
- 优先做小而聚焦、匹配当前 flat Go structure 的改动。

---

## Testing Requirements

项目当前没有 established tests。未来 non-trivial backend changes 在可行时应补测试，尤其覆盖：

- AES-CBC decrypt success and failure cases；
- invalid Base64 ciphertext input；
- invalid key length 或 missing IV prefix；
- decoded ciphertext length not aligned to the AES block size；
- invalid PKCS7 padding；
- missing 或 duplicate config environments；
- 不应依赖真实 user home directory 的 database behavior。

报告 backend work 完成前，至少运行相关 build/verification commands。

---

## Verification Commands

使用现有命令，并准确说明它们验证了什么：

```bash
go test ./...
```

这是标准 Go test command。即使没有 tests，它也能捕获 compilation failures。

```bash
npm run build
```

直接验证 frontend build output 时，在 `frontend/` 下运行。

```bash
make build
```

依赖可用时，通过 Makefile/Wails setup 运行项目 build flow。

当前没有配置 `npm run lint`、`npm run typecheck`、`go vet` 或 `golangci-lint` project scripts。

---

## Known Quality Risks

- `NewDecryptService()` 会创建目录、打开真实 user database、运行 migration、初始化 defaults，这让 isolated tests 更难写。
- `app.go` 当前只打印 initialization failure，可能留下 `a.service` nil。
- `decrypt.go` 中的 crypto code 必须防止 invalid user input 导致 panic。
- `decrypt.go` 中的 `createIV` 当前未使用，可能误导后续读者理解 decrypt protocol。
- Config keys 以 plaintext 存储在 SQLite 中，因此 logs 和 UI errors 必须格外谨慎。
- `frontend/src/App.vue` 当前承担较多职责；较大的 frontend additions 应考虑 extraction。

---

## Anti-patterns and Forbidden Patterns

- 不要让 malformed user input 触发 panic。
- 不要 logging 或 display keys、IV prefixes、ciphertext、plaintext、decrypted output 或 full config records。
- 不要绕过 Go changes 的 `gofmt`。
- 不要声称不存在的 lint/typecheck/test scripts 已经存在。
- 小改动不要引入过宽的 abstractions 或新的 directory structures。
- 做相关改动时不要留下 unused helpers 或 stale constants。
- 不要静默忽略 crypto、database、filesystem 或 Wails calls errors。

---

## Code Review Checklist

接受 backend changes 前检查：

- 改动是否匹配当前 Wails binding model，而不是假设 HTTP？
- 是否在 crypto/database 使用前验证所有 user inputs？
- Errors 是否适合 UI 展示且不包含 secrets？
- Database changes 是否兼容已有 local SQLite files？
- Changed Go files 是否已用 `gofmt` 格式化？
- 是否运行并准确报告了合适的 verification commands？
- 改动是否避免无必要地扩大现有 known risks？
