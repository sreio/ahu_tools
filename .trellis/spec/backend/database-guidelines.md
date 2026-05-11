# Database Guidelines

> 本项目 database patterns 与 conventions。

---

## Overview

本项目使用 SQLite 作为本地 desktop database，使用 GORM 作为 Go ORM。当前 database code 位于 `service.go`。

当前实现事实：

- `service.go` imports `gorm.io/gorm` 和 `gorm.io/driver/sqlite`。
- `DecryptService` 持有 `*gorm.DB` connection。
- Database file 创建在用户 home directory 下：`.ahutools/config.db`。
- Schema 创建/演进当前使用 `migrateLegacyToolHistory(db)` 和 `db.AutoMigrate(&Config{}, &ToolOrder{}, &ToolHistory{}, &H5DecryptConfig{})`。
- 当前没有 migrations directory，也没有 hand-written SQL migration framework；需要兼容旧本地 SQLite 文件时，在 AutoMigrate 前加入聚焦的兼容迁移函数。

---

## Data Model

当前持久化 models 位于 `service.go`。

解密配置 model 是 `Config`：

```go
type Config struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Environment string `gorm:"uniqueIndex;not null" json:"environment"`
	Key         string `gorm:"not null" json:"key"`
	Description string `json:"description"`
}
```

`environment` 字段是唯一索引，用于查找 decrypt operations 的 config。`Description` 保存 UI 展示用的环境说明。

工具排序 model 是 `ToolOrder`：

```go
type ToolOrder struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	ToolKey  string `gorm:"uniqueIndex;not null" json:"toolKey"`
	Position int    `gorm:"not null" json:"position"`
}
```

`ToolOrder` 只保存 frontend tool key 和排序位置，不保存 Vue component、工具名称或完整工具 metadata。Frontend 的 `frontend/src/tools/index.js` 仍是工具定义 source of truth；backend 只负责持久化 key 顺序。

工具输入历史 model 是 `ToolHistory`：

```go
type ToolHistory struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	ToolKey       string    `gorm:"index;not null" json:"toolKey"`
	Action        string    `gorm:"not null" json:"action"`
	Success       bool      `gorm:"not null" json:"success"`
	InputSnapshot string    `gorm:"not null" json:"inputSnapshot"`
	InputSummary  string    `json:"inputSummary"`
	SchemaVersion int       `gorm:"not null;default:1" json:"schemaVersion"`
	CreatedAt     time.Time `gorm:"index" json:"createdAt"`
}
```

`ToolHistory.InputSnapshot` 保存 frontend 传入的输入快照 JSON 字符串，只保存输入字段，不保存解析结果或输出。`SchemaVersion` 用于后续快照结构演进。

H5 解密配置 model 是 `H5DecryptConfig`：

```go
type H5DecryptConfig struct {
	ID                    uint   `gorm:"primaryKey" json:"id"`
	Environment           string `gorm:"uniqueIndex" json:"environment"`
	Description           string `json:"description"`
	RequestAES256CBCIV    string `json:"request_aes_256_cbc_iv"`
	RequestAES256CBCKey   string `json:"request_aes_256_cbc_key"`
	ServerRSAPrivateKey   string `json:"server_rsa_private_key"`
	ResponseAES256CBCIV   string `json:"response_aes_256_cbc_iv"`
	ResponseAES256CBCKey  string `json:"response_aes_256_cbc_key"`
	ClientRSAPrivateKey   string `json:"client_rsa_private_key"`
}
```

`H5DecryptConfig` 使用 `environment` 区分多套 H5 配置，并在每个环境内区分请求解密配置与响应解密配置。请求解密使用 `ServerRSAPrivateKey` 和 request AES fallback 字段；响应解密使用 `ClientRSAPrivateKey` 和 response AES fallback 字段。该表独立于旧 `Config` 表，避免改变原有 `数据解密` 工具的 16 字节 key 语义。

---

## Query Patterns

Database access 应保持在 `DecryptService` methods 后面。`service.go` 中的当前示例包括：

- `GetConfig(environment string)` 使用 `Where("environment = ?", environment).First(&config)`。
- `GetAllConfigs()` 使用 `Find(&configs)`。
- `SaveConfig(config Config)` 校验 `environment` 和 16-byte-or-empty `key`，检查现有 environment，然后 `Create` 或 `Save`。
- `DeleteConfig(environment string)` 按 environment 删除。
- `GetToolOrder() ([]string, error)` 按 `position ASC` 读取 `ToolOrder`，只返回 tool key 列表。
- `SaveToolOrder(toolKeys []string) error` 去重、过滤空 key，并在 transaction 中替换整份排序。
- `RecordToolHistory(entry ToolHistory) error` 校验 tool key、action 和 input snapshot，裁剪展示字段，并在 transaction 中写入历史和清理 200 条以外的旧记录。
- `GetToolHistory(limit int) ([]ToolHistory, error)` 默认读取最近 50 条，最大 200 条，按 `created_at DESC, id DESC` 排序。
- `ClearToolHistory() error` 清空全部工具输入历史。
- `GetAllH5DecryptConfigs() ([]H5DecryptConfig, error)` 读取全部 H5 环境配置。
- `GetH5DecryptConfig(environment string) (*H5DecryptConfig, error)` 按 environment 读取 H5 配置，不存在时返回 `H5环境配置不存在`。
- `SaveH5DecryptConfig(config H5DecryptConfig) error` 校验 environment、请求/响应 IV 为空或 16 字节、请求/响应 AES key 为空或 32 字节，并按 environment create 或 update。
- `initDefaultConfigs()` 在缺失时 seed `test` 和 `production` configs，默认 key 为空，并带有中文 descriptions。
- `initDefaultH5DecryptConfigs()` 在缺失时 seed `test` 和 `production` H5 configs，默认 key/IV/RSA 字段为空，并带有中文 descriptions。

Wails-facing methods on `*App` 应委托给 service，不要自己打开 database connection。依赖 `a.service` 的 Wails methods 必须先检查 service 是否为 nil，并返回安全错误（例如 `配置服务未初始化`）。

---

## Migrations

当前 schema management 是 automatic，但允许在 `AutoMigrate` 前加入兼容旧 SQLite 文件的聚焦迁移：

```go
if err := migrateLegacyToolHistory(db); err != nil {
	return nil, fmt.Errorf("历史记录迁移失败: %v", err)
}
if err := migrateLegacyH5DecryptConfig(db); err != nil {
	return nil, fmt.Errorf("H5配置迁移失败: %v", err)
}
if err := db.AutoMigrate(&Config{}, &ToolOrder{}, &ToolHistory{}, &H5DecryptConfig{}); err != nil {
	return nil, fmt.Errorf("数据库迁移失败: %v", err)
}
```

当前没有 versioned migrations。新增字段或修改 schema 时，需要考虑用户机器上已经存在的 `~/.ahutools/config.db`。这是 local desktop application，因此 SQLite compatibility 和 data preservation 很重要。新增表应通过 `AutoMigrate` 保留已有 `Config` 数据。

SQLite 不支持所有 GORM 自动迁移形态。例如给已有表追加无默认值的 `NOT NULL` 字段或直接追加 `UNIQUE` 字段可能导致迁移失败，并阻断 `NewDecryptService()` 初始化。遇到这类局部、可丢弃数据（例如旧格式工具历史）时，可以在 AutoMigrate 前检测旧 schema 并重建对应表；不得重建或删除承载用户配置的 `configs` 表。H5 解密配置属于可丢弃的工具专用配置；当旧 H5 schema 不包含请求/响应拆分字段时，初始化会直接丢弃旧 `h5_decrypt_configs` 表并重建默认环境。

---

## Sensitive Data

Configuration keys 当前以 plaintext 存储在 SQLite 中：

```go
Key string `gorm:"not null" json:"key"`
```

因为这个工具处理 decrypt configuration，以下内容都视为 sensitive：

- configured decrypt keys, including H5 AES/RSA config fields
- ciphertext submitted by the user
- decrypted plaintext/result data
- full database dumps

不要新增会暴露这些值的 logs、error messages、debug prints 或 UI messages。

---

## Testability Notes

`NewDecryptService()` 当前有副作用：

- 读取用户 home directory
- 创建 `~/.ahutools`
- 打开真实 SQLite database file
- 运行 `AutoMigrate`
- 初始化 default configs

新增 database-heavy behavior 时，优先考虑可测试设计，例如 injectable database path 或 `*gorm.DB`。不要把 filesystem/database initialization side effects 扩散到无关的 Wails methods 中。

---

## Naming Conventions

- Go model names 使用 PascalCase，例如 `Config`。
- JSON fields 默认使用 lower camel case；需要匹配外部配置名时可使用明确的 snake_case tags，例如 H5 `request_aes_256_cbc_key`。
- GORM column names 默认遵循 GORM conventions，除非 tags 明确指定。
- 当前唯一 lookup key 是 `environment`；保持 environment names 稳定，因为用户本地可能已有 records。

---

## Anti-patterns

- 不要在任意 `*App` methods 中打开新的独立 SQLite connections。
- 不要在 service initialization path 之外硬编码额外 database paths。
- 不要假设已经存在 versioned migrations。
- 不要记录 keys、plaintext、ciphertext 或 full config records 到 logs。
- Database initialization failure 后不要静默继续并留下 nil service；在 startup handling 更严格之前，service-dependent methods 必须 guard。
- 不要在未考虑用户机器上已有 `~/.ahutools/config.db` 的情况下修改 schema。
