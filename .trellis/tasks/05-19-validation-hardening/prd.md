# 完善验证功能与验证报告

## Goal

完善现有验证/校验能力，优先修复普通 AES 解密边界输入可能导致 panic 的问题，补齐测试与统一验证命令，并输出修改与验证报告，确保不影响现有功能。

## Requirements

- 补齐普通 AES-CBC 解密的 decoded ciphertext block size 校验，避免 malformed user input 触发 panic。
- 补齐 PKCS7 unpad 标准校验，包括 padding 为 0 和 padding 字节不一致。
- 新增普通 AES 解密相关 Go 测试，覆盖成功路径和关键失败路径。
- 增强更新下载校验，至少校验实际下载字节数与 asset size 一致。
- 增加统一验证入口，方便本地和 CI 运行 Go/frontend 测试。
- 统一前后端 AES key/IV 的字节长度校验语义，避免 JS string length 与 Go byte length 不一致。
- 对 H5 AES key/IV 保存与使用前做首尾空白 trim，降低复制粘贴导致的误失败。
- 更新 README 中与当前功能、测试命令、平台支持相关的说明。
- 生成本次修改与验证报告 Markdown 文件。

## Acceptance Criteria

- [ ] `go test ./...` 通过。
- [ ] `npm run test --prefix frontend` 通过。
- [ ] 新增的普通 AES 解密测试能先复现现有缺口，再由实现修复通过。
- [ ] malformed AES ciphertext 不会触发 panic，而是返回安全错误。
- [ ] 非法 PKCS7 padding 被拒绝。
- [ ] 更新下载大小不匹配时返回错误并清理临时文件。
- [ ] README 与验证报告准确描述本次变更与验证结果。

## Definition of Done

- Tests added/updated where behavior changes.
- Go files are gofmt formatted.
- Verification commands are executed and documented.
- No secrets, ciphertext, plaintext, or full config values are logged or exposed in new errors.
- No unrelated refactor or broad directory restructuring.

## Technical Approach

Use focused changes in existing files. Add regression tests before production changes. Keep Wails-facing error behavior safe and user-correctable. Use existing flat `package main` Go layout and existing Vue/Vite frontend structure.

## Out of Scope

- Introducing a new logging library, migration framework, or package structure.
- Implementing full release checksum/signature verification.
- Adding Linux application auto-install support.
- Reworking the full frontend validation architecture.

## Technical Notes

Relevant guidelines read:

- `.trellis/spec/backend/directory-structure.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`

Primary files expected to change:

- `decrypt.go`
- `decrypt_test.go`
- `update.go`
- `update_test.go`
- `service.go`
- `service_test.go`
- `frontend/src/App.vue`
- `Makefile`
- `build.sh`
- `.github/workflows/release.yml`
- `README.md`
- `docs/validation-hardening-report.md`
