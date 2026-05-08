package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNormalizeVersion(t *testing.T) {
	tests := map[string]string{
		"v1.2.3":  "1.2.3",
		"V1.2.3":  "1.2.3",
		" 1.2.3 ": "1.2.3",
	}

	for input, want := range tests {
		if got := normalizeVersion(input); got != want {
			t.Fatalf("normalizeVersion(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestCompareVersions(t *testing.T) {
	tests := []struct {
		name  string
		left  string
		right string
		want  int
	}{
		{name: "newer patch", left: "1.2.4", right: "1.2.3", want: 1},
		{name: "older minor", left: "1.1.0", right: "1.2.0", want: -1},
		{name: "same with prefix", left: "v1.2.3", right: "1.2.3", want: 0},
		{name: "missing patch", left: "1.2", right: "1.2.0", want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := compareVersions(tt.left, tt.right)
			if err != nil {
				t.Fatalf("compareVersions returned error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("compareVersions(%q, %q) = %d, want %d", tt.left, tt.right, got, tt.want)
			}
		})
	}
}

func TestCompareVersionsRejectsInvalid(t *testing.T) {
	if _, err := compareVersions("1.2.x", "1.2.0"); err == nil {
		t.Fatal("expected invalid version error")
	}
}

func TestFindPlatformAsset(t *testing.T) {
	release := githubRelease{
		Assets: []githubReleaseAsset{
			{Name: "AhuTools-windows-amd64-installer.exe", BrowserDownloadURL: "https://example.com/win.exe", Size: 10},
			{Name: "AhuTools-darwin-arm64.dmg", BrowserDownloadURL: "https://example.com/mac.dmg", Size: 20},
		},
	}

	asset, ok := findPlatformAsset(release, "darwin", "arm64")
	if !ok {
		t.Fatal("expected darwin arm64 asset")
	}
	if asset.Name != "AhuTools-darwin-arm64.dmg" {
		t.Fatalf("unexpected asset: %s", asset.Name)
	}
}

func TestFindPlatformAssetNoMatch(t *testing.T) {
	release := githubRelease{Assets: []githubReleaseAsset{{Name: "AhuTools-windows-amd64-installer.exe"}}}
	_, ok := findPlatformAsset(release, "linux", "amd64")
	if ok {
		t.Fatal("expected no matching linux asset")
	}
}

func TestCheckForUpdateFromEndpointNewVersion(t *testing.T) {
	published := time.Date(2026, 5, 8, 10, 0, 0, 0, time.UTC)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"tag_name":"v1.2.0",
			"name":"AhuTools v1.2.0",
			"html_url":"https://github.com/sreio/ahu_tools/releases/tag/v1.2.0",
			"published_at":"` + published.Format(time.RFC3339) + `",
			"body":"Release notes",
			"draft":false,
			"prerelease":false,
			"assets":[{"name":"AhuTools-darwin-arm64.dmg","browser_download_url":"https://example.com/AhuTools.dmg","size":1024}]
		}`))
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if !info.Success {
		t.Fatalf("expected success, got error %s", info.Error)
	}
	if !info.HasUpdate {
		t.Fatal("expected update")
	}
	if info.LatestVersion != "1.2.0" {
		t.Fatalf("expected latest version 1.2.0, got %s", info.LatestVersion)
	}
	if info.Asset == nil || info.Asset.Name != "AhuTools-darwin-arm64.dmg" {
		t.Fatalf("expected matched asset, got %#v", info.Asset)
	}
}

func TestCheckForUpdateFromEndpointNoUpdate(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"tag_name":"v1.0.0","draft":false,"prerelease":false,"assets":[]}`))
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if !info.Success {
		t.Fatalf("expected success, got error %s", info.Error)
	}
	if info.HasUpdate {
		t.Fatal("expected no update")
	}
	if info.Message != "当前已是最新版本" {
		t.Fatalf("unexpected message: %s", info.Message)
	}
}

func TestCheckForUpdateFromEndpointNoMatchingAsset(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"tag_name":"v1.2.0",
			"draft":false,
			"prerelease":false,
			"assets":[{"name":"AhuTools-windows-amd64-installer.exe","browser_download_url":"https://example.com/win.exe","size":1024}]
		}`))
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if !info.Success {
		t.Fatalf("expected success, got error %s", info.Error)
	}
	if !info.HasUpdate {
		t.Fatal("expected update")
	}
	if info.PlatformHasAsset {
		t.Fatal("expected no platform asset")
	}
	if info.Message != "发现新版本，但当前平台没有匹配的安装包或可执行产物" {
		t.Fatalf("unexpected message: %s", info.Message)
	}
}

func TestCheckForUpdateFromEndpointAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "rate limited", http.StatusForbidden)
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if info.Success {
		t.Fatal("expected failure")
	}
	if info.Error != "GitHub API 返回异常，请稍后重试" {
		t.Fatalf("unexpected error: %s", info.Error)
	}
}

func TestCheckForUpdateFromEndpointNotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "not found", http.StatusNotFound)
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if info.Success {
		t.Fatal("expected failure")
	}
	if info.Error != "当前没有可用的正式 Release" {
		t.Fatalf("unexpected error: %s", info.Error)
	}
}

func TestCheckForUpdateFromEndpointInvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`not-json`))
	}))
	defer server.Close()

	info := checkForUpdateFromEndpoint(server.URL, "1.0.0", "darwin", "arm64")
	if info.Success {
		t.Fatal("expected failure")
	}
	if info.Error != "Release 信息解析失败，请稍后重试" {
		t.Fatalf("unexpected error: %s", info.Error)
	}
}
