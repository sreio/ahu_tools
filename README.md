# AhuTools - 开发者工具箱

AhuTools 是一个基于 Go + Wails v2 + Vue 3 的桌面开发者工具箱，提供数据解密、H5 请求/响应解密、JSON/JWT/Base64/URL/正则/哈希/时间戳等常用工具，并支持本地配置持久化、工具排序、输入历史和应用内更新检查。

## 功能特性

- 数据解密：支持带 16 字节 IV 前缀的 AES-128-CBC 解密，环境密钥按测试/生产/自定义环境管理。
- H5 解密：支持 request/response 模式，支持 payload JSON 中 RSA 解密 AES key，也支持 raw encryptData + 配置 AES key/IV fallback。
- 开发工具：JSON 格式化/压缩、Base64、URL 编解码、时间戳、随机字符串、UUID、Hash、Regex、JWT decode/sign/verify。
- 本地配置：使用 SQLite 保存普通解密配置、H5 解密配置、工具排序和输入历史。
- 应用更新：支持检查 GitHub Release，并在 Windows/macOS 下载匹配安装包。
- 跨平台构建：支持 Windows/macOS/Linux 的 Wails 构建；应用内自动安装当前仅支持 Windows/macOS。

## 技术栈

- 后端：Go 1.22 + Wails v2
- 前端：Vue 3 + Vite + Element Plus
- 数据库：SQLite + GORM
- 测试：Go test + Vitest

## 项目信息

- 软件名称：AhuTools
- 版本：见 `VERSION`
- 作者：sreio

## 快速开始

### 安装依赖

```bash
make install
```

### 开发模式

```bash
make dev
```

### 测试与验证

```bash
# Go + 前端测试
make test

# Go + 前端测试、版本同步检查，并验证前端构建
make verify

# 也可以单独执行
go test ./...
npm run test --prefix frontend
npm run build --prefix frontend
```

### 构建

```bash
# 构建所有平台
make build

# 或构建特定平台
make build-windows   # Windows AMD64 & ARM64
make build-darwin    # macOS AMD64 & ARM64
make build-linux     # Linux AMD64 & ARM64
```

也可以直接运行：

```bash
./build.sh
```

`build.sh` 会先安装依赖并运行 Go/frontend 测试，再开始多平台构建。

### 发布版本

发布前只需要修改根目录 `VERSION`。`make build` 和 `./build.sh` 会自动把它同步到 `wails.json`、`frontend/package.json` 和 `frontend/package-lock.json`；也可以手动运行：

```bash
make sync-version
make check-version
```

## 使用说明

### 普通数据解密

1. 打开配置，维护环境标识和 16 字节 AES key。
2. 在“数据解密”工具中选择环境。
3. 输入格式为：前 16 字节 IV + 后续 Base64 编码 ciphertext。
4. 点击解密后，工具会展示原文；如果原文是 JSON，会自动支持格式化展示。

### H5 解密

1. 打开 H5 配置，按环境维护 request/response 两组配置。
2. request payload 模式使用 `SERVER_RSA_PRIVATE_KEY` 解密 `secretKey`。
3. response payload 模式使用 `CLIENT_RSA_PRIVATE_KEY` 解密 `secretKey`。
4. raw encryptData 模式使用对应 request/response AES-256-CBC key，并优先使用 encryptData 前 16 字节作为 IV；如果无法按前缀 IV 解密，会尝试配置中的 fallback IV。
5. AES-256-CBC key 按 UTF-8 字节长度校验为 32 字节，IV 校验为 16 字节；保存和解密时会 trim 首尾空白。

### 应用内更新

- 更新检查读取 GitHub 最新正式 Release。
- Windows 匹配 `windows-<arch>.exe`，macOS 匹配 `darwin-<arch>.dmg`。
- 下载完成后会校验实际下载大小与 Release asset size 一致。
- Linux 当前支持构建，但不支持应用内自动安装更新。

## 项目结构

```text
ahu_tools/
├── app.go                    # Wails App lifecycle 和 metadata
├── main.go                   # Wails 入口与绑定
├── decrypt.go                # 普通 AES-CBC 解密
├── h5_decrypt.go             # H5 request/response 解密
├── service.go                # SQLite/GORM 配置、排序、历史服务
├── update.go                 # 应用更新检查、下载与安装
├── *_test.go                 # Go 测试
├── Makefile                  # 常用开发、测试、构建命令
├── build.sh                  # 多平台构建脚本
├── wails.json                # Wails 配置
├── docs/                     # 项目文档与报告
└── frontend/
    ├── package.json          # 前端脚本和依赖
    ├── src/
    │   ├── App.vue           # 主界面和 Wails 调用编排
    │   ├── components/       # 配置弹窗、侧边栏等组件
    │   ├── tools/            # 各工具 UI 组件
    │   └── utils/            # 前端工具函数与测试
    └── wailsjs/              # Wails 生成代码
```

## Makefile 命令

```bash
make install          # 安装依赖
make dev              # 开发模式
make test             # 运行 Go 和前端测试
make verify           # 运行测试、版本同步检查并验证前端构建
make sync-version     # 同步 VERSION 到发布元数据
make check-version    # 检查发布元数据是否匹配 VERSION
make build            # 构建所有平台
make build-windows    # 构建 Windows 版本
make build-darwin     # 构建 macOS 版本
make build-linux      # 构建 Linux 版本
make clean            # 清理构建文件
make version          # 显示版本信息
make help             # 显示帮助信息
```

## 系统要求

### 开发环境

- Go 1.22+
- Node.js 20+
- Wails CLI v2.11+

### 运行环境

- Windows 10+
- macOS 10.13+
- Linux 主流发行版（当前不支持应用内自动安装更新）

## 安全与校验说明

- 不在日志、错误信息或报告中输出密钥、密文、明文或完整配置记录。
- 普通 AES 和 H5 AES 解密都会校验 Base64、ciphertext block size 与 PKCS7 padding，避免畸形输入导致 panic。
- 更新包下载会校验实际字节数与 Release asset size 一致；checksum/signature 校验仍属于后续增强项。

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 作者

sreio

---

版本：见 `VERSION`  
更新日期：2026
