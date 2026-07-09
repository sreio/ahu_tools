package main

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteGeneratedImageFileDecodesPayload(t *testing.T) {
	path := filepath.Join(t.TempDir(), "preview.png")
	want := []byte("generated-image-bytes")
	request := GeneratedImageSaveRequest{
		FileName:   "preview.png",
		Extension:  "png",
		Mime:       "image/png",
		DataBase64: base64.StdEncoding.EncodeToString(want),
	}

	if err := writeGeneratedImageFile(path, request); err != nil {
		t.Fatalf("writeGeneratedImageFile returned error: %v", err)
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read generated image: %v", err)
	}
	if string(got) != string(want) {
		t.Fatalf("generated image bytes = %q, want %q", string(got), string(want))
	}
}

func TestWriteGeneratedImageFileRejectsInvalidPayload(t *testing.T) {
	path := filepath.Join(t.TempDir(), "preview.png")
	request := GeneratedImageSaveRequest{
		FileName:   "preview.png",
		Extension:  "png",
		Mime:       "image/png",
		DataBase64: "not base64",
	}

	err := writeGeneratedImageFile(path, request)
	if err == nil || !strings.Contains(err.Error(), "invalid image data") {
		t.Fatalf("writeGeneratedImageFile error = %v, want invalid image data", err)
	}
	if _, statErr := os.Stat(path); !os.IsNotExist(statErr) {
		t.Fatalf("invalid payload wrote file, stat error = %v", statErr)
	}
}
