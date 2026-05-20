# 验证功能完善修改与验证报告

## 背景

本次工作基于验证功能梳理结论，重点完善普通 AES 解密、H5 解密配置、更新包下载、统一验证命令、Release CI 和文档说明，目标是提高输入边界安全性、避免 malformed user input 导致 panic，并提供可重复执行的验证入口。

## 修改范围

### 1. 普通 AES 解密安全校验

涉及文件：

- `decrypt.go`
- `decrypt_test.go`

修改内容：

- `App.Decrypt` 增加 `a.service == nil` guard，服务未初始化时返回安全错误 `配置服务未初始化`，避免 nil pointer panic。
- `decrypt` 在 Base64 解码后校验 decoded ciphertext：
  - 必须非空；
  - 必须是 `aes.BlockSize` 的整数倍。
- `pkcs7Unpad` 补齐标准 PKCS7 padding 校验：
  - 拒绝 `padding == 0`；
  - 拒绝 padding 长度超过数据长度或 AES block size；
  - 校验最后 N 个 padding 字节全部等于 padding 值。
- 新增普通 AES 解密回归测试，覆盖：
  - 服务未初始化安全错误；
  - JSON 解密成功；
  - ciphertext 非 AES block size 倍数；
  - padding 为 0；
  - padding 字节不一致；
  - Base64 非法输入。

### 2. H5 配置 trim 与校验一致性

涉及文件：

- `service.go`
- `service_test.go`
- `h5_decrypt.go`
- `h5_decrypt_test.go`
- `frontend/src/App.vue`
- `frontend/src/utils/devTools.js`
- `frontend/src/utils/devTools.test.js`

修改内容：

- 后端新增 `normalizeH5DecryptConfig`，集中 trim H5 环境、AES key/IV、RSA 私钥字段首尾空白。
- `SaveH5DecryptConfig` 使用统一 normalize helper 后再做长度校验和保存。
- H5 解密选择 RSA 私钥、AES key/IV 时复用同一 normalize helper，兼容历史数据库中可能存在首尾空白的配置值。
- 普通 `SaveConfig` 也在后端边界 trim `Environment` 和 `Key`，避免仅依赖前端规范化。
- 前端新增 `getUtf8ByteLength`，配置保存时按 UTF-8 字节长度校验 key/IV，而不是 JS UTF-16 code unit 长度。
- 前端 H5 key/IV 校验改为表驱动规则，减少 request/response 字段重复校验逻辑。
- 新增测试覆盖：
  - 普通配置保存 trim；
  - H5 配置保存 trim；
  - H5 raw 解密使用 trim 后的配置值；
  - `getUtf8ByteLength('中文') === 6`。

### 3. 更新包下载校验

涉及文件：

- `update.go`
- `update_test.go`

修改内容：

- `DownloadUpdate` 要求 asset name、URL、size 都有效。
- `downloadFile` 增加 expected size 参数。
- 下载前检查 HTTP `Content-Length`，如果与 expected size 不一致则直接失败。
- 下载时使用 `io.LimitReader` 限制最多读取 `expectedSize + 1` 字节，避免异常响应导致无界写入。
- 下载完成后校验实际写入字节数与 expected size 一致。
- size mismatch 时清理 `.part` 临时文件且不生成最终文件。
- 新增测试覆盖下载成功 rename 和 size mismatch 清理行为。

### 4. 统一验证入口与 CI

涉及文件：

- `Makefile`
- `build.sh`
- `.github/workflows/release.yml`

修改内容：

- `Makefile` 新增：
  - `make test`：运行 `go test ./...` 和 `npm run test --prefix frontend`；
  - `make verify`：运行 `make test` 后再执行 `npm run build --prefix frontend`。
- `build.sh` 在多平台构建前先执行 Go/frontend 测试。
- Release workflow 新增独立 `test` job：
  - 运行 Go 测试；
  - 运行前端 Vitest。
- Release `build` matrix job 改为 `needs: test`，避免在每个平台构建任务里重复执行相同测试。

### 5. README 文档更新

涉及文件：

- `README.md`

修改内容：

- 项目定位从单一“数据解密工具”更新为“开发者工具箱”。
- 补充当前实际功能：普通 AES 解密、H5 request/response 解密、JSON/JWT/Base64/URL/正则/哈希/时间戳等工具、输入历史、工具排序、应用更新。
- 增加 `make test`、`make verify`、单独测试/构建命令说明。
- 明确区分跨平台构建与应用内自动安装支持：Linux 可构建，但当前不支持应用内自动安装更新。
- 增加安全与校验说明：不输出密钥/密文/明文，解密路径校验 block size 与 PKCS7 padding，更新包校验下载大小。

## 审查发现与处理

本次修改后执行了复用、质量、效率三类审查，并处理有效发现：

- 移除测试失败信息中输出完整 `H5DecryptConfig` 的模式，避免测试日志暴露 key/IV/private key 字段。
- 普通 `SaveConfig` 增加后端 trim，后端作为 Wails boundary 不再依赖前端唯一规范化入口。
- 普通 `App.Decrypt` 增加 service nil guard，避免服务初始化失败后的 panic。
- 前端 H5 key/IV 校验改为表驱动，降低复制粘贴和漏改风险。
- Go 侧 H5 trim 行为收敛到 `normalizeH5DecryptConfig`。
- `downloadFile` 增加 `Content-Length` 预检与 `LimitReader`，避免异常响应造成无界下载。
- Release CI 测试抽成单独 job，避免 matrix 重复执行同一测试集。

## 验证过程

### TDD 红灯验证

新增测试后，曾观察到以下预期失败，证明测试可以捕获原缺口：

- 普通 AES malformed ciphertext 触发 `crypto/cipher: input not full blocks` panic。
- 普通 AES `padding == 0` 被错误接受。
- 普通 AES padding 字节不一致被错误接受。
- 更新下载测试因 `downloadFile` 尚未接收 expected size 参数而编译失败。
- H5 配置 trim 测试在原实现下失败。
- 前端 `getUtf8ByteLength` 测试在工具函数尚不存在时失败。
- 普通 `App.Decrypt` 在 service nil 时 panic。

### 最终验证命令

已执行：

```bash
go test ./...
```

结果：通过。

已执行：

```bash
npm run test --prefix frontend
```

结果：通过，2 个 test files、37 个 tests 通过。

已执行：

```bash
make verify
```

结果：通过，包含：

- `go test ./...` 通过；
- `npm run test --prefix frontend` 通过；
- `npm run build --prefix frontend` 通过。

前端构建期间存在 Vite 输出的既有提示：

- Vite CJS Node API deprecation warning；
- chunk size 超过 500 kB 的 warning。

这些 warning 不影响本次验证结果，且不属于本次验证功能完善范围。

已执行：

```bash
bash -n build.sh
```

结果：通过，无语法错误输出。

## 风险与后续建议

- 更新包当前已校验下载大小，但尚未实现 checksum/signature 校验。后续可在 Release 中发布 checksum 文件，并在下载后校验。
- `uniqueDownloadPath` 与最终 rename 之间仍存在跨进程竞态窗口；当前已避免 `.part` 残留与大小不匹配落盘，后续如需进一步增强，可设计跨平台不覆盖提交策略。
- Vite chunk size warning 是既有构建体积提示，后续可按需做代码分割或 manualChunks 优化。

## 结论

本次验证功能完善已完成：普通 AES/H5 解密边界更安全，配置保存和前端校验语义更一致，更新包下载增加大小校验，统一验证入口和 Release CI 测试已补齐，README 与本报告已落地。最终验证通过，现有功能未发现回归。
