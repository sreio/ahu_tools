package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type GeneratedImageSaveRequest struct {
	FileName   string `json:"fileName"`
	Extension  string `json:"extension"`
	Mime       string `json:"mime"`
	DataBase64 string `json:"dataBase64"`
}

type GeneratedImageSaveResponse struct {
	Success   bool   `json:"success"`
	Cancelled bool   `json:"cancelled"`
	Path      string `json:"path,omitempty"`
	Message   string `json:"message,omitempty"`
	Error     string `json:"error,omitempty"`
}

func (a *App) SaveGeneratedImage(request GeneratedImageSaveRequest) GeneratedImageSaveResponse {
	if a.ctx == nil {
		return GeneratedImageSaveResponse{Success: false, Error: "应用尚未初始化完成，请稍后重试"}
	}

	normalized, err := normalizeGeneratedImageSaveRequest(request)
	if err != nil {
		return GeneratedImageSaveResponse{Success: false, Error: err.Error()}
	}

	path, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		DefaultFilename:      normalized.FileName,
		Title:                "保存生成图片",
		CanCreateDirectories: true,
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: fmt.Sprintf("%s 图片 (*.%s)", strings.ToUpper(normalized.Extension), normalized.Extension), Pattern: "*." + normalized.Extension},
			{DisplayName: "所有文件 (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return GeneratedImageSaveResponse{Success: false, Error: "打开保存对话框失败，请稍后重试"}
	}
	if path == "" {
		return GeneratedImageSaveResponse{Success: false, Cancelled: true, Message: "已取消保存"}
	}
	if filepath.Ext(path) == "" {
		path += "." + normalized.Extension
	}

	if err := writeGeneratedImageFile(path, normalized); err != nil {
		return GeneratedImageSaveResponse{Success: false, Error: "保存图片失败，请重新选择路径后再试"}
	}

	return GeneratedImageSaveResponse{Success: true, Path: path, Message: "图片已保存"}
}

func normalizeGeneratedImageSaveRequest(request GeneratedImageSaveRequest) (GeneratedImageSaveRequest, error) {
	request.FileName = strings.TrimSpace(request.FileName)
	request.Extension = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(request.Extension)), ".")
	request.Mime = strings.TrimSpace(request.Mime)
	request.DataBase64 = strings.TrimSpace(request.DataBase64)

	if request.FileName == "" {
		request.FileName = "ahu-tools-image.png"
	}
	if request.Extension == "" {
		request.Extension = strings.TrimPrefix(strings.ToLower(filepath.Ext(request.FileName)), ".")
	}
	if !isSupportedGeneratedImageExtension(request.Extension) {
		return request, errors.New("图片格式无效，请选择 PNG、JPEG 或 WebP")
	}
	if request.DataBase64 == "" {
		return request, errors.New("图片数据为空，请重新生成后再保存")
	}
	if filepath.Ext(request.FileName) == "" {
		request.FileName += "." + request.Extension
	}

	return request, nil
}

func isSupportedGeneratedImageExtension(extension string) bool {
	switch extension {
	case "png", "jpg", "jpeg", "webp":
		return true
	default:
		return false
	}
}

func writeGeneratedImageFile(path string, request GeneratedImageSaveRequest) error {
	if strings.TrimSpace(path) == "" {
		return errors.New("save path is empty")
	}
	normalized, err := normalizeGeneratedImageSaveRequest(request)
	if err != nil {
		return err
	}

	data, err := decodeGeneratedImageData(normalized.DataBase64)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func decodeGeneratedImageData(value string) ([]byte, error) {
	if comma := strings.Index(value, ","); strings.HasPrefix(value, "data:") && comma >= 0 {
		value = value[comma+1:]
	}
	data, err := base64.StdEncoding.DecodeString(value)
	if err != nil || len(data) == 0 {
		return nil, errors.New("invalid image data")
	}
	return data, nil
}
