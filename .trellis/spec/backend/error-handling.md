# Error Handling

> 本项目 errors 的处理方式。

---

## Overview

本 backend 通过 Wails bindings 被调用，不通过 HTTP。因此 error handling 主要分为两层：

1. Wails-facing methods 返回安全的 response values，供 Vue UI 展示。
2. Internal Go helpers 返回 `error`，由 caller 决定如何转换成 UI 可见失败。

除非项目实际引入 HTTP server，否则不要用 HTTP status codes 描述 backend failures。

---

## Wails Boundary Errors

`decrypt.go` 定义了面向用户的 decrypt response shape：

```go
type DecryptResponse struct {
	Success     bool        `json:"success"`
	Data        interface{} `json:"data,omitempty"`
	Raw         string      `json:"raw,omitempty"`
	IsJSON      bool        `json:"isJson"`
	Environment string      `json:"environment"`
	Error       string      `json:"error,omitempty"`
}
```

`App.Decrypt(...)` 对用户可修正的问题返回 `DecryptResponse{Success: false, Error: "..."}`，例如缺少输入、缺少 config、invalid ciphertext 或 decrypt failure。

`frontend/src/App.vue` 同时处理 transport-level failures 和 response-level failures：

- Wails call failures 通过 `try/catch/finally` 处理。
- Business failures 从 `response.success` 和 `response.error` 读取。

---

## Internal Error Patterns

Internal functions 应返回 `error`，不要 panic。当前示例包括：

- `NewDecryptService()` 返回 `(*DecryptService, error)`。
- `GetConfig(...)` 返回 `(*Config, error)`。
- decrypt helpers 对 decode/decrypt failures 返回 `(string, error)`。

当前代码常用带上下文的 `%v` 包装 errors，例如：

```go
return nil, fmt.Errorf("打开数据库失败: %v", err)
```

如果未来需要用 `errors.Is` 或 `errors.As` 做 error comparison/wrapping，优先使用 `%w`：

```go
return nil, fmt.Errorf("打开数据库失败: %w", err)
```

简单 business errors 可使用 `errors.New(...)`，例如 missing environment config。

---

## API Error Responses

因为这是 Wails app，API response 是通过 Wails bridge 序列化的 Go struct。保持 response errors 可安全展示：

- 说明用户可以修正什么。
- 除非必要，避免暴露 raw filesystem paths。
- 如果 raw database errors 可能暴露 local paths 或 implementation details，不要直接返回给 frontend。
- Error strings 中绝不能包含 keys、IV prefixes、ciphertext、plaintext 或 decrypted data。

---

## Panic Prevention

用户输入不能导致 app crash。Crypto 和 decoding code 在 slicing 或 decrypting 前必须校验输入：

- key presence 和 length accepted by AES
- encrypted data length 足以包含 IV prefix
- IV prefix length 等于 `aes.BlockSize`
- Base64 ciphertext decode success
- decoded ciphertext length 非零
- decoded ciphertext length 是 `aes.BlockSize` 的倍数
- PKCS7 padding length 在 indexing 或 slicing 前有效

这对 `decrypt.go` 尤其重要，因为 invalid ciphertext 或 padding 直接来自用户输入。

---

## Startup Errors

`app.go` 当前用 `fmt.Printf` 记录 service initialization failure：

```go
service, err := NewDecryptService()
if err != nil {
	fmt.Printf("Failed to initialize service: %v\n", err)
}
a.service = service
```

这可能导致 `a.service` 为 nil。在 startup handling 更严格之前，任何依赖 `a.service` 的新 Wails method 都应先 guard，并返回安全的 user-facing error，而不是直接 dereference。

---

## Anti-patterns and Common Mistakes

- 把 Wails method failures 当作 HTTP responses 处理。
- 直接把 raw database、filesystem 或 crypto internals 返回给 frontend。
- 忽略 filesystem、database、Base64 decoding、AES setup 或 padding validation errors。
- 允许 invalid user input 在 crypto code 中触发 panic。
- 在 error strings 中 logging 或 returning decrypted secret data。
- 新增 service-dependent `*App` methods 时不检查 service initialization 是否可能失败。
