#!/bin/bash

# AhuTools 构建脚本
# 作者: sreio
# 版本: 1.0.0

set -e

APP_NAME="AhuTools"
VERSION="1.0.0"

echo "================================"
echo "  $APP_NAME v$VERSION"
echo "  构建脚本"
echo "================================"
echo ""

# 检查 Wails 是否安装
if ! command -v wails &> /dev/null; then
    echo "错误: Wails CLI 未安装"
    echo "请运行: go install github.com/wailsapp/wails/v2/cmd/wails@latest"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
go mod download
cd frontend && npm install && cd ..

# 构建所有平台
echo ""
echo "🔨 开始构建..."
echo ""

# Windows
echo "构建 Windows AMD64..."
wails build -platform windows/amd64 -o ${APP_NAME}-windows-amd64.exe

echo "构建 Windows ARM64..."
wails build -platform windows/arm64 -o ${APP_NAME}-windows-arm64.exe

# macOS
echo "构建 macOS AMD64..."
wails build -platform darwin/amd64 -o ${APP_NAME}-darwin-amd64

echo "构建 macOS ARM64..."
wails build -platform darwin/arm64 -o ${APP_NAME}-darwin-arm64

# Linux
echo "构建 Linux AMD64..."
wails build -platform linux/amd64 -o ${APP_NAME}-linux-amd64

echo "构建 Linux ARM64..."
wails build -platform linux/arm64 -o ${APP_NAME}-linux-arm64

echo ""
echo "✅ 构建完成！"
echo ""
echo "构建产物位于 build/bin/ 目录"
