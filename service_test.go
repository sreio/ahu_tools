package main

import (
	"path/filepath"
	"reflect"
	"testing"
)

func newTestDecryptService(t *testing.T) *DecryptService {
	t.Helper()

	service, err := newDecryptServiceWithDBPath(filepath.Join(t.TempDir(), "config.db"))
	if err != nil {
		t.Fatalf("create test service: %v", err)
	}
	return service
}

func TestNewDecryptServiceWithDBPathInitializesDefaultConfigs(t *testing.T) {
	service := newTestDecryptService(t)

	for _, environment := range []string{"test", "production"} {
		if _, err := service.GetConfig(environment); err != nil {
			t.Fatalf("expected default config %q: %v", environment, err)
		}
	}
}

func TestToolOrderPersistsInPositionOrder(t *testing.T) {
	service := newTestDecryptService(t)
	want := []string{"json", "decrypt", "base64"}

	if err := service.SaveToolOrder(want); err != nil {
		t.Fatalf("save tool order: %v", err)
	}

	got, err := service.GetToolOrder()
	if err != nil {
		t.Fatalf("get tool order: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("tool order = %#v, want %#v", got, want)
	}
}

func TestSaveToolOrderReplacesExistingOrder(t *testing.T) {
	service := newTestDecryptService(t)

	if err := service.SaveToolOrder([]string{"json", "decrypt", "base64"}); err != nil {
		t.Fatalf("save initial tool order: %v", err)
	}

	want := []string{"jwt", "hash"}
	if err := service.SaveToolOrder(want); err != nil {
		t.Fatalf("replace tool order: %v", err)
	}

	got, err := service.GetToolOrder()
	if err != nil {
		t.Fatalf("get tool order: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("tool order = %#v, want %#v", got, want)
	}
}

func TestSaveToolOrderDeduplicatesKeys(t *testing.T) {
	service := newTestDecryptService(t)
	want := []string{"json", "base64", "hash"}

	if err := service.SaveToolOrder([]string{"json", "base64", "json", "", "hash", "base64"}); err != nil {
		t.Fatalf("save tool order: %v", err)
	}

	got, err := service.GetToolOrder()
	if err != nil {
		t.Fatalf("get tool order: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("tool order = %#v, want %#v", got, want)
	}
}

func TestSaveToolOrderClearsOrder(t *testing.T) {
	service := newTestDecryptService(t)

	if err := service.SaveToolOrder([]string{"json", "decrypt"}); err != nil {
		t.Fatalf("save initial tool order: %v", err)
	}
	if err := service.SaveToolOrder(nil); err != nil {
		t.Fatalf("clear tool order: %v", err)
	}

	got, err := service.GetToolOrder()
	if err != nil {
		t.Fatalf("get tool order: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("tool order = %#v, want empty", got)
	}
}
