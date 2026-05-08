# Backend Development Guidelines

> 本项目 backend 开发规范索引。

---

## Overview

本目录记录这个 Wails desktop application 的 backend 规范。在本项目中，"backend" 指绑定到 Vue frontend 的 Go/Wails 层，不是 HTTP API server。

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Wails/Go 模块组织与文件布局 | Filled |
| [Database Guidelines](./database-guidelines.md) | GORM、SQLite、本地 config DB 与数据访问模式 | Filled |
| [Error Handling](./error-handling.md) | Wails response errors、Go internal errors 与 panic prevention | Filled |
| [Quality Guidelines](./quality-guidelines.md) | 代码标准、验证命令与 forbidden patterns | Filled |
| [Logging Guidelines](./logging-guidelines.md) | 当前 ad-hoc logging 与 secret-safe logging 规则 | Filled |

---

## How to Use These Guidelines

开始 backend 开发前，先阅读和本次改动相关的具体 guideline 文件。这个 index 只负责导航；实际要求写在链接到的文档中。

本项目开发时请遵循：

1. 匹配当前 Wails desktop backend 模型。
2. 记录和实现真实存在的约定，不套用通用 web-server patterns。
3. 避免在 logs、UI errors、debug output 中暴露 secrets。
4. 如果某项实践只是 future recommendation，而不是当前能力，必须明确说明。

---

**Language**: 文档正文使用简体中文；代码片段、命令、文件路径、API 名称和常用技术名词可保留英文。
