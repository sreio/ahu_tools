.PHONY: build build-windows build-darwin build-linux clean install dev test verify sync-version check-version

APP_NAME=AhuTools
APP_VERSION := $(shell sed -n '1p' VERSION | tr -d '[:space:]')
AUTHOR=sreio

# 默认构建
build: build-windows build-darwin build-linux

sync-version:
	node scripts/sync-version.mjs

check-version:
	node scripts/sync-version.mjs --check

# 安装依赖
install:
	@echo "Installing dependencies..."
	go mod download
	cd frontend && npm install

# 开发模式
dev:
	wails dev

# 运行测试
test:
	npm run test --prefix frontend
	npm run build --prefix frontend
	go test ./...

# 完整验证
verify: test check-version

# Windows构建
build-windows: sync-version
	@echo "Building for Windows AMD64..."
	wails build -platform windows/amd64 -o $(APP_NAME)-windows-amd64.exe
	@echo "Building for Windows ARM64..."
	wails build -platform windows/arm64 -o $(APP_NAME)-windows-arm64.exe

# macOS构建
build-darwin: sync-version
	@echo "Building for macOS AMD64..."
	wails build -platform darwin/amd64 -o $(APP_NAME)-darwin-amd64
	@echo "Building for macOS ARM64..."
	wails build -platform darwin/arm64 -o $(APP_NAME)-darwin-arm64

# Linux构建
build-linux: sync-version
	@echo "Building for Linux AMD64..."
	wails build -platform linux/amd64 -o $(APP_NAME)-linux-amd64
	@echo "Building for Linux ARM64..."
	wails build -platform linux/arm64 -o $(APP_NAME)-linux-arm64

# 清理构建文件
clean:
	@echo "Cleaning build artifacts..."
	rm -rf build/
	rm -f $(APP_NAME)-*

# 显示版本信息
version:
	@echo "App Name: $(APP_NAME)"
	@echo "Version: $(APP_VERSION)"
	@echo "Author: $(AUTHOR)"

# 帮助信息
help:
	@echo "AhuTools Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Run in development mode"
	@echo "  make test             - Run Go and frontend tests"
	@echo "  make verify           - Run tests and frontend build"
	@echo "  make sync-version     - Sync VERSION into release metadata"
	@echo "  make check-version    - Check release metadata matches VERSION"
	@echo "  make build            - Build for all platforms"
	@echo "  make build-windows    - Build for Windows (AMD64 & ARM64)"
	@echo "  make build-darwin     - Build for macOS (AMD64 & ARM64)"
	@echo "  make build-linux      - Build for Linux (AMD64 & ARM64)"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make version          - Show version information"
	@echo "  make help             - Show this help message"
