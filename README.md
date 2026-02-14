# AhuTools - 数据解密工具

一个基于 Golang + Wails + Vue3 开发的跨平台数据解密工具，支持 AES-128-CBC 算法解密。

## 功能特性

- 🔐 支持 AES-128-CBC 算法解密
- 🌍 多环境配置支持（测试/生产/自定义环境）
- 💾 SQLite3 本地数据库持久化配置
- 🖥️ 跨平台支持（Windows/macOS/Linux，AMD64/ARM64）
- 📱 现代化的 Vue3 界面
- ⚙️ 可视化配置管理
- 📋 一键复制解密结果
- 🔄 JSON 格式化显示

## 技术栈

- **后端**: Golang
- **前端框架**: Wails v2
- **UI 框架**: Vue 3
- **数据库**: SQLite3
- **构建工具**: Vite

## 项目信息

- **软件名称**: AhuTools
- **版本**: 1.0.0
- **作者**: sreio

## 快速开始

### 安装依赖

```bash
# 安装 Go 依赖和前端依赖
make install
```

### 开发模式

```bash
# 启动开发服务器
make dev
```

### 构建

```bash
# 构建所有平台
make build

# 或构建特定平台
make build-windows   # Windows (AMD64 & ARM64)
make build-darwin    # macOS (Intel & Apple Silicon)
make build-linux     # Linux (AMD64 & ARM64)
```

## 使用说明

### 1. 配置环境密钥

首次运行应用后，点击右上角的 "⚙️ 配置" 按钮：

1. 为测试环境和生产环境配置 16 字节密钥
2. 可以添加自定义环境
3. 点击"保存配置"按钮保存

### 2. 解密数据

1. 在主界面选择环境（测试/生产/自定义）
2. 在文本框中输入加密数据
3. 点击"解密数据"按钮
4. 查看解密结果（支持 JSON 格式和原始数据切换）
5. 可以一键复制结果

## 项目结构

```
ahu_tools/
├── main.go                 # 主入口
├── app.go                  # 应用逻辑
├── decrypt.go              # 解密功能
├── service.go              # 数据库服务
├── go.mod                  # Go 依赖
├── wails.json              # Wails 配置
├── Makefile                # 构建脚本
├── build.sh                # Shell 构建脚本
├── .gitignore              # Git 忽略文件
├── .editorconfig           # 编辑器配置
├── LICENSE                 # MIT 许可证
└── frontend/               # 前端代码
    ├── package.json        # 前端依赖
    ├── vite.config.js      # Vite 配置
    ├── index.html          # HTML 入口
    └── src/
        ├── main.js         # JS 入口
        ├── App.vue         # 主组件
        └── style.css       # 样式文件
```

## Makefile 命令

```bash
make install          # 安装依赖
make dev              # 开发模式
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

- Go 1.21+
- Node.js 16+
- Wails CLI v2

### 运行环境

- Windows 10+
- macOS 10.13+
- Linux (主流发行版)

## 文档

详细文档请查看上级目录：

- [快速开始指南](../QUICKSTART.md)
- [安装指南](../INSTALL.md)
- [架构说明](../ARCHITECTURE.md)
- [项目总结](../PROJECT_SUMMARY.md)
- [更新日志](../CHANGELOG.md)
- [项目交付说明](../项目交付说明.md)

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 作者

sreio

---

**版本**: 1.0.0  
**更新日期**: 2024
