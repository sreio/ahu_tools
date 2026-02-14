.PHONY: build build-windows build-darwin build-linux clean install dev

APP_NAME=AhuTools
VERSION=1.0.0
AUTHOR=sreio

# 默认构建
build: build-windows build-darwin build-linux

# 安装依赖
install:
	@echo "Installing dependencies..."
	go mod download
	cd frontend && npm install

# 开发模式
dev:
	wails dev

# Windows构建
build-windows:
	@echo "Building for Windows AMD64..."
	wails build -platform windows/amd64 -o $(APP_NAME)-windows-amd64.exe
	@echo "Building for Windows ARM64..."
	wails build -platform windows/arm64 -o $(APP_NAME)-windows-arm64.exe

# macOS构建
build-darwin:
	@echo "Building for macOS AMD64..."
	wails build -platform darwin/amd64 -o $(APP_NAME)-darwin-amd64
	@echo "Building for macOS ARM64..."
	wails build -platform darwin/arm64 -o $(APP_NAME)-darwin-arm64

# Linux构建
build-linux:
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
	@echo "Version: $(VERSION)"
	@echo "Author: $(AUTHOR)"

# 帮助信息
help:
	@echo "AhuTools Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Run in development mode"
	@echo "  make build            - Build for all platforms"
	@echo "  make build-windows    - Build for Windows (AMD64 & ARM64)"
	@echo "  make build-darwin     - Build for macOS (AMD64 & ARM64)"
	@echo "  make build-linux      - Build for Linux (AMD64 & ARM64)"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make version          - Show version information"
	@echo "  make help             - Show this help message"
