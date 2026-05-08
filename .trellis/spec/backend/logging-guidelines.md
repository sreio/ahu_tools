# Logging Guidelines

> 本项目 logging 的处理方式。

---

## Overview

当前项目没有统一的 backend logging library，也没有 structured logging layer。现有 logging/output 很少且偏 ad hoc：

- `main.go` 在 `wails.Run(...)` 失败时使用 `log.Fatal`。
- `app.go` 在 `NewDecryptService()` startup 失败时使用 `fmt.Printf`。
- `frontend/src/App.vue` 对部分 frontend-side failures 使用 `console.error`。
- `build.sh` 和 Makefile workflow 使用 shell output 展示 build progress。

不要假设本项目已有 server log collector、request logs、JSON logs、trace IDs 或 centralized logger。

---

## Log Levels

当前没有 project-wide log levels。

保守使用现有模式：

- `main.go` 中 fatal startup failures 可以使用 `log.Fatal`。
- Temporary startup diagnostics 当前使用 `fmt.Printf`，但不要把这个模式扩散到 business logic。
- Frontend-only diagnostic failures 在对开发者有帮助时可以使用 `console.error`。

如果后续引入真正的 logger，应集中做 project-level decision，并一致地迁移 callers，不要混用多个 logging libraries。

---

## Structured Logging

当前没有 structured logging。不要编写假设 request IDs、users、HTTP routes 或 trace IDs 等 required fields 已存在的规范或代码。

如果未来引入 structured logging，需要考虑 Wails desktop context：

- 可能没有 server-side log aggregation；
- logs 可能保存在用户机器上；
- logs 不能暴露 decrypt secrets 或本地 private data。

---

## What to Log

可接受的 logging/output 仅限 non-sensitive operational context，例如：

- 有助于诊断本地环境问题的 application startup failure details；
- 如果未来引入 logger，可记录 high-level lifecycle events；
- shell scripts 中的 build progress 和 build failures。

对 user-correctable failures，优先返回安全的 Wails response errors，而不是在每一层都打印 failure。

---

## What NOT to Log

Never log:

- configured decrypt keys;
- ciphertext submitted by the user;
- decrypted plaintext or parsed JSON results;
- full `Config` records;
- database dumps;
- unnecessary user home paths or local filesystem details.

这条规则适用于 Go logs、`fmt.Printf`、frontend `console.error`、shell scripts、temporary debugging output，以及未来可能引入的 logging libraries。

---

## Error Logging

避免在每一层重复 logging。对于 Wails methods，选择以下模式之一：

- 对 expected/user-correctable failures，向 UI 返回 safe error string；
- 只在有用的 boundary 记录 non-sensitive diagnostic；
- 为 callers 包装 internal errors with context，但不要暴露 secrets。

---

## Anti-patterns

- 不要围绕 decrypt input、keys、IV prefixes、ciphertext 或 output 添加 `fmt.Println` / `fmt.Printf` debug logs。
- 不要为了排查 crypto failures 而 logging secrets。
- 未经 project-level decision，不要引入多个 logging libraries。
- 不要声称 frontend `console.error` 已经提供足够 backend observability。
- 除非实际引入 HTTP server，否则不要加入 HTTP request logging concepts。
