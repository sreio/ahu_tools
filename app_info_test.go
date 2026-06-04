package main

import (
	"os"
	"strings"
	"testing"
)

func TestVersionMatchesVersionFile(t *testing.T) {
	data, err := os.ReadFile("VERSION")
	if err != nil {
		t.Fatalf("read VERSION: %v", err)
	}

	want := strings.TrimSpace(string(data))
	if Version != want {
		t.Fatalf("Version = %q, want %q from VERSION", Version, want)
	}
}
