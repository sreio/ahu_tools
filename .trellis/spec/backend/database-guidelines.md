# Database Guidelines

> 本项目 database patterns 与 conventions。

---

## Overview

本项目使用 SQLite 作为本地 desktop database，使用 GORM 作为 Go ORM。当前 database code 位于 `service.go`。

当前实现事实：

- `service.go` imports `gorm.io/gorm` 和 `gorm.io/driver/sqlite`。
- `DecryptService` 持有 `*gorm.DB` connection。
- Database file 创建在用户 home directory 下：`.ahutools/config.db`。
- Schema 创建/演进当前使用 `db.AutoMigrate(&Config{})`。
- 当前没有 migrations directory，也没有 hand-written SQL migration framework。

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

---

## Query Patterns

Database access 应保持在 `DecryptService` methods 后面。`service.go` 中的当前示例包括：

- `GetConfig(environment string)` 使用 `Where("environment = ?", environment).First(&config)`。
- `GetAllConfigs()` 使用 `Find(&configs)`。
- `SaveConfig(config Config)` 校验 `environment` 和 16-byte-or-empty `key`，检查现有 environment，然后 `Create` 或 `Save`。
- `DeleteConfig(environment string)` 按 environment 删除。
- `GetToolOrder() ([]string, error)` 按 `position ASC` 读取 `ToolOrder`，只返回 tool key 列表。
- `SaveToolOrder(toolKeys []string) error` 去重、过滤空 key，并在 transaction 中替换整份排序。
- `initDefaultConfigs()` 在缺失时 seed `test` 和 `production` configs，默认 key 为空，并带有中文 descriptions。

Wails-facing methods on `*App` 应委托给 service，不要自己打开 database connection。依赖 `a.service` 的 Wails methods 必须先检查 service 是否为 nil，并返回安全错误（例如 `配置服务未初始化`）。

---

## Migrations

当前 schema management 是 automatic：

```go
if err := db.AutoMigrate(&Config{}, &ToolOrder{}); err != nil {
	return nil, fmt.Errorf("数据库迁移失败: %v", err)
}
```

当前没有 versioned migrations。新增字段或修改 schema 时，需要考虑用户机器上已经存在的 `~/.ahutools/config.db`。这是 local desktop application，因此 SQLite compatibility 和 data preservation 很重要。新增表应通过 `AutoMigrate` 保留已有 `Config` 数据。

---

## Sensitive Data

Configuration keys 当前以 plaintext 存储在 SQLite 中：

```go
Key string `gorm:"not null" json:"key"`
```

因为这个工具处理 decrypt configuration，以下内容都视为 sensitive：

- configured decrypt keys
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
- JSON fields 使用 lower camel case。
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
