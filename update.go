package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const githubLatestReleaseURL = "https://api.github.com/repos/sreio/ahu_tools/releases/latest"

type DownloadAsset struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Size int64  `json:"size"`
}

type UpdateInfo struct {
	Success          bool           `json:"success"`
	HasUpdate        bool           `json:"hasUpdate"`
	CurrentVersion   string         `json:"currentVersion"`
	LatestVersion    string         `json:"latestVersion,omitempty"`
	ReleaseName      string         `json:"releaseName,omitempty"`
	ReleaseURL       string         `json:"releaseUrl,omitempty"`
	ReleaseNotes     string         `json:"releaseNotes,omitempty"`
	PublishedAt      string         `json:"publishedAt,omitempty"`
	Asset            *DownloadAsset `json:"asset,omitempty"`
	Platform         string         `json:"platform"`
	Message          string         `json:"message,omitempty"`
	Error            string         `json:"error,omitempty"`
	PlatformHasAsset bool           `json:"platformHasAsset"`
}

type DownloadUpdateResponse struct {
	Success   bool   `json:"success"`
	Cancelled bool   `json:"cancelled"`
	Path      string `json:"path,omitempty"`
	Message   string `json:"message,omitempty"`
	Error     string `json:"error,omitempty"`
}

type InstallUpdateResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

type githubRelease struct {
	TagName     string               `json:"tag_name"`
	Name        string               `json:"name"`
	HTMLURL     string               `json:"html_url"`
	PublishedAt string               `json:"published_at"`
	Body        string               `json:"body"`
	Draft       bool                 `json:"draft"`
	Prerelease  bool                 `json:"prerelease"`
	Assets      []githubReleaseAsset `json:"assets"`
}

type githubReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

func (a *App) CheckForUpdate() UpdateInfo {
	return checkForUpdateFromEndpoint(githubLatestReleaseURL, Version, runtime.GOOS, runtime.GOARCH)
}

func (a *App) DownloadUpdate(asset DownloadAsset) DownloadUpdateResponse {
	if a.ctx == nil {
		return DownloadUpdateResponse{Success: false, Error: "应用尚未初始化完成，请稍后重试"}
	}
	if strings.TrimSpace(asset.Name) == "" || strings.TrimSpace(asset.URL) == "" {
		return DownloadUpdateResponse{Success: false, Error: "下载资源信息不完整，请重新检查更新"}
	}

	path, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		DefaultFilename: asset.Name,
		Title:           "保存更新安装包",
	})
	if err != nil {
		return DownloadUpdateResponse{Success: false, Error: "打开保存对话框失败，请稍后重试"}
	}
	if path == "" {
		return DownloadUpdateResponse{Success: false, Cancelled: true, Message: "已取消保存"}
	}

	downloadPath, err := uniqueDownloadPath(path)
	if err != nil {
		return DownloadUpdateResponse{Success: false, Error: "保存路径不可用，请重新选择"}
	}

	if err := downloadFile(asset.URL, downloadPath); err != nil {
		_ = os.Remove(downloadPath)
		_ = os.Remove(downloadPath + ".part")
		return DownloadUpdateResponse{Success: false, Error: "下载安装包失败，请稍后重试"}
	}

	return DownloadUpdateResponse{Success: true, Path: downloadPath, Message: "下载完成"}
}

func (a *App) InstallDownloadedUpdate(path string) InstallUpdateResponse {
	if a.ctx == nil {
		return InstallUpdateResponse{Success: false, Error: "应用尚未初始化完成，请稍后重试"}
	}
	path = strings.TrimSpace(path)
	if path == "" {
		return InstallUpdateResponse{Success: false, Error: "安装包路径无效，请重新下载"}
	}
	if err := validateUpdatePackagePath(runtime.GOOS, path); err != nil {
		return InstallUpdateResponse{Success: false, Error: err.Error()}
	}

	executablePath, err := os.Executable()
	if err != nil {
		return InstallUpdateResponse{Success: false, Error: "无法定位当前应用，请手动安装更新"}
	}
	command, err := buildInstallUpdateCommand(runtime.GOOS, path, executablePath, os.Getpid())
	if err != nil {
		return InstallUpdateResponse{Success: false, Error: err.Error()}
	}
	if err := command.Start(); err != nil {
		return InstallUpdateResponse{Success: false, Error: "启动安装包失败，请手动打开安装"}
	}

	go func() {
		time.Sleep(800 * time.Millisecond)
		wailsRuntime.Quit(a.ctx)
	}()

	return InstallUpdateResponse{Success: true, Message: installUpdateMessage(runtime.GOOS)}
}

func checkForUpdateFromEndpoint(endpoint string, currentVersion string, goos string, goarch string) UpdateInfo {
	info := UpdateInfo{
		Success:        false,
		CurrentVersion: normalizeVersion(currentVersion),
		Platform:       goos + "/" + goarch,
	}

	client := &http.Client{Timeout: 15 * time.Second}
	request, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		info.Error = "更新检查地址无效，请稍后重试"
		return info
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("User-Agent", "AhuTools")

	resp, err := client.Do(request)
	if err != nil {
		info.Error = "网络连接失败，请检查网络后重试"
		return info
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		info.Error = "当前没有可用的正式 Release"
		return info
	}
	if resp.StatusCode != http.StatusOK {
		info.Error = "GitHub API 返回异常，请稍后重试"
		return info
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		info.Error = "Release 信息解析失败，请稍后重试"
		return info
	}

	if release.Draft || release.Prerelease {
		info.Error = "当前没有可用的正式 Release"
		return info
	}

	latestVersion := normalizeVersion(release.TagName)
	comparison, err := compareVersions(latestVersion, currentVersion)
	if err != nil {
		info.Error = "版本号格式无法识别，请稍后重试"
		return info
	}

	info.Success = true
	info.LatestVersion = latestVersion
	info.ReleaseName = release.Name
	info.ReleaseURL = release.HTMLURL
	info.ReleaseNotes = release.Body
	info.PublishedAt = release.PublishedAt

	if comparison <= 0 {
		info.HasUpdate = false
		info.Message = "当前已是最新版本"
		return info
	}

	info.HasUpdate = true
	asset, ok := findPlatformAsset(release, goos, goarch)
	if !ok {
		info.PlatformHasAsset = false
		info.Message = "发现新版本，但当前平台没有匹配的安装包或可执行产物"
		return info
	}

	info.PlatformHasAsset = true
	info.Asset = &DownloadAsset{Name: asset.Name, URL: asset.BrowserDownloadURL, Size: asset.Size}
	info.Message = "发现新版本"
	return info
}

func normalizeVersion(version string) string {
	version = strings.TrimSpace(version)
	version = strings.TrimPrefix(version, "v")
	version = strings.TrimPrefix(version, "V")
	return version
}

func compareVersions(left string, right string) (int, error) {
	leftParts, err := parseVersionParts(left)
	if err != nil {
		return 0, err
	}
	rightParts, err := parseVersionParts(right)
	if err != nil {
		return 0, err
	}

	for index := 0; index < 3; index++ {
		if leftParts[index] > rightParts[index] {
			return 1, nil
		}
		if leftParts[index] < rightParts[index] {
			return -1, nil
		}
	}

	return 0, nil
}

func parseVersionParts(version string) ([3]int, error) {
	var result [3]int
	parts := strings.Split(normalizeVersion(version), ".")
	if len(parts) == 0 || len(parts) > 3 {
		return result, errors.New("invalid version")
	}

	for index, part := range parts {
		if part == "" {
			return result, errors.New("invalid version")
		}
		value, err := strconv.Atoi(part)
		if err != nil {
			return result, err
		}
		result[index] = value
	}

	return result, nil
}

func findPlatformAsset(release githubRelease, goos string, goarch string) (githubReleaseAsset, bool) {
	platform := goos + "-" + goarch
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if !strings.Contains(name, platform) {
			continue
		}
		if goos == "windows" && strings.HasSuffix(name, ".exe") {
			return asset, true
		}
		if goos == "darwin" && strings.HasSuffix(name, ".dmg") {
			return asset, true
		}
	}

	return githubReleaseAsset{}, false
}

func validateUpdatePackagePath(goos string, path string) error {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return errors.New("安装包不存在，请重新下载")
	}

	extension := strings.ToLower(filepath.Ext(path))
	if goos == "windows" && extension != ".exe" {
		return errors.New("Windows 更新包必须是 .exe 安装程序")
	}
	if goos == "darwin" && extension != ".dmg" {
		return errors.New("macOS 更新包必须是 .dmg 文件")
	}
	if goos != "windows" && goos != "darwin" {
		return errors.New("当前平台暂不支持自动安装更新")
	}

	return nil
}

func buildInstallUpdateCommand(goos string, packagePath string, executablePath string, currentPID int) (*exec.Cmd, error) {
	if goos == "windows" {
		script := fmt.Sprintf(
			"Wait-Process -Id %d -ErrorAction SilentlyContinue; Start-Process -FilePath %s -ArgumentList '/S' -Wait; Start-Sleep -Seconds 2; for ($i = 0; $i -lt 90; $i++) { if (Test-Path %s) { Start-Process -FilePath %s; exit 0 }; Start-Sleep -Seconds 1 }; exit 1",
			currentPID,
			quotePowerShellString(packagePath),
			quotePowerShellString(executablePath),
			quotePowerShellString(executablePath),
		)
		return exec.Command("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script), nil
	}
	if goos == "darwin" {
		return exec.Command("open", packagePath), nil
	}

	return nil, errors.New("当前平台暂不支持自动安装更新")
}

func quotePowerShellString(value string) string {
	return `'` + strings.ReplaceAll(value, `'`, `''`) + `'`
}

func installUpdateMessage(goos string) string {
	if goos == "windows" {
		return "安装程序已启动，应用即将退出并在安装完成后重启"
	}
	if goos == "darwin" {
		return "DMG 已打开，应用即将退出，请在 Finder 中完成安装"
	}
	return "安装程序已启动，应用即将退出"
}

func uniqueDownloadPath(path string) (string, error) {
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return path, nil
	} else if err != nil {
		return "", err
	}

	dir := filepath.Dir(path)
	extension := filepath.Ext(path)
	baseName := strings.TrimSuffix(filepath.Base(path), extension)
	for index := 1; index <= 99; index++ {
		candidate := filepath.Join(dir, fmt.Sprintf("%s-%d%s", baseName, index, extension))
		if _, err := os.Stat(candidate); errors.Is(err, os.ErrNotExist) {
			return candidate, nil
		} else if err != nil {
			return "", err
		}
	}

	return "", errors.New("no available download path")
}

func downloadFile(url string, path string) error {
	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	tempPath := path + ".part"
	_ = os.Remove(tempPath)
	file, err := os.OpenFile(tempPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return err
	}

	if _, err := io.Copy(file, resp.Body); err != nil {
		_ = file.Close()
		_ = os.Remove(tempPath)
		return err
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(tempPath)
		return err
	}

	if err := os.Rename(tempPath, path); err != nil {
		_ = os.Remove(tempPath)
		return err
	}
	return nil
}
