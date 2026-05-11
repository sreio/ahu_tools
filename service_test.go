package main

import (
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type legacyToolHistory struct {
	ID        uint      `gorm:"primaryKey"`
	ToolKey   string    `gorm:"index;not null"`
	Action    string    `gorm:"not null"`
	Success   bool      `gorm:"not null"`
	CreatedAt time.Time `gorm:"index"`
}

func (legacyToolHistory) TableName() string {
	return "tool_histories"
}

func newTestDecryptService(t *testing.T) *DecryptService {
	t.Helper()

	service, err := newDecryptServiceWithDBPath(filepath.Join(t.TempDir(), "config.db"))
	if err != nil {
		t.Fatalf("create test service: %v", err)
	}
	return service
}

func TestNewDecryptServiceMigratesLegacyToolHistoryWithoutLosingConfigs(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "config.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if err := db.AutoMigrate(&Config{}, &ToolOrder{}, &legacyToolHistory{}); err != nil {
		t.Fatalf("migrate legacy db: %v", err)
	}
	if err := db.Create(&Config{Environment: "custom", Key: "1234567890123456", Description: "旧配置"}).Error; err != nil {
		t.Fatalf("create legacy config: %v", err)
	}
	if err := db.Create(&legacyToolHistory{ToolKey: "json", Action: "格式化", Success: true, CreatedAt: time.Now()}).Error; err != nil {
		t.Fatalf("create legacy history: %v", err)
	}
	if sqlDB, err := db.DB(); err == nil {
		_ = sqlDB.Close()
	}

	service, err := newDecryptServiceWithDBPath(dbPath)
	if err != nil {
		t.Fatalf("open migrated service: %v", err)
	}
	config, err := service.GetConfig("custom")
	if err != nil {
		t.Fatalf("get legacy config: %v", err)
	}
	if config.Key != "1234567890123456" || config.Description != "旧配置" {
		t.Fatalf("config = %#v, want legacy config preserved", config)
	}
	if err := service.RecordToolHistory(ToolHistory{ToolKey: "json", Action: "格式化", Success: true, InputSnapshot: `{"input":"demo"}`}); err != nil {
		t.Fatalf("record new history after migration: %v", err)
	}
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

func TestToolHistoryRecordsInputSnapshotMetadata(t *testing.T) {
	service := newTestDecryptService(t)

	if err := service.RecordToolHistory(ToolHistory{
		ToolKey:       "json",
		Action:        "格式化",
		Success:       true,
		InputSnapshot: `{"input":"{\"name\":\"IT工具箱\"}"}`,
		InputSummary:  "25 chars",
	}); err != nil {
		t.Fatalf("record tool history: %v", err)
	}

	got, err := service.GetToolHistory(10)
	if err != nil {
		t.Fatalf("get tool history: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("history length = %d, want 1", len(got))
	}
	if got[0].InputSnapshot != `{"input":"{\"name\":\"IT工具箱\"}"}` {
		t.Fatalf("input snapshot = %q", got[0].InputSnapshot)
	}
	if got[0].InputSummary != "25 chars" {
		t.Fatalf("input summary = %q", got[0].InputSummary)
	}
	if got[0].SchemaVersion != 1 {
		t.Fatalf("schema version = %d, want 1", got[0].SchemaVersion)
	}
}

func TestToolHistoryRecordsMetadataInNewestFirstOrder(t *testing.T) {
	service := newTestDecryptService(t)
	baseTime := time.Date(2026, 5, 11, 10, 0, 0, 0, time.UTC)

	entries := []ToolHistory{
		{ToolKey: "json", Action: "格式化", Success: true, InputSnapshot: `{"input":"demo"}`, CreatedAt: baseTime},
		{ToolKey: "jwt", Action: "验签", Success: false, InputSnapshot: `{"input":"demo"}`, CreatedAt: baseTime.Add(2 * time.Minute)},
		{ToolKey: "base64", Action: "Decode", Success: true, InputSnapshot: `{"input":"demo"}`, CreatedAt: baseTime.Add(time.Minute)},
	}
	for _, entry := range entries {
		if err := service.RecordToolHistory(entry); err != nil {
			t.Fatalf("record tool history: %v", err)
		}
	}

	got, err := service.GetToolHistory(10)
	if err != nil {
		t.Fatalf("get tool history: %v", err)
	}
	wantKeys := []string{"jwt", "base64", "json"}
	if len(got) != len(wantKeys) {
		t.Fatalf("history length = %d, want %d", len(got), len(wantKeys))
	}
	for index, wantKey := range wantKeys {
		if got[index].ToolKey != wantKey {
			t.Fatalf("history[%d].ToolKey = %q, want %q", index, got[index].ToolKey, wantKey)
		}
	}
	if got[0].Action != "验签" || got[0].Success {
		t.Fatalf("newest history = %#v, want jwt failed verification metadata", got[0])
	}
}

func TestToolHistoryLimitDefaultsAndCapsAtRetentionLimit(t *testing.T) {
	service := newTestDecryptService(t)
	baseTime := time.Date(2026, 5, 11, 10, 0, 0, 0, time.UTC)

	for index := 0; index < 205; index++ {
		if err := service.RecordToolHistory(ToolHistory{
			ToolKey:       "json",
			Action:        "格式化",
			Success:       true,
			InputSnapshot: `{"input":"demo"}`,
			CreatedAt:     baseTime.Add(time.Duration(index) * time.Second),
		}); err != nil {
			t.Fatalf("record tool history %d: %v", index, err)
		}
	}

	defaultHistory, err := service.GetToolHistory(0)
	if err != nil {
		t.Fatalf("get default history: %v", err)
	}
	if len(defaultHistory) != 50 {
		t.Fatalf("default history length = %d, want 50", len(defaultHistory))
	}

	cappedHistory, err := service.GetToolHistory(500)
	if err != nil {
		t.Fatalf("get capped history: %v", err)
	}
	if len(cappedHistory) != 200 {
		t.Fatalf("capped history length = %d, want 200", len(cappedHistory))
	}
	if cappedHistory[0].CreatedAt.Before(cappedHistory[len(cappedHistory)-1].CreatedAt) {
		t.Fatalf("history is not ordered newest first")
	}
}

func TestClearToolHistory(t *testing.T) {
	service := newTestDecryptService(t)

	if err := service.RecordToolHistory(ToolHistory{ToolKey: "json", Action: "格式化", Success: true, InputSnapshot: `{"input":"demo"}`}); err != nil {
		t.Fatalf("record tool history: %v", err)
	}
	if err := service.ClearToolHistory(); err != nil {
		t.Fatalf("clear tool history: %v", err)
	}

	got, err := service.GetToolHistory(10)
	if err != nil {
		t.Fatalf("get tool history: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("history = %#v, want empty", got)
	}
}

func TestToolHistoryRejectsMissingToolKeyActionOrSnapshot(t *testing.T) {
	service := newTestDecryptService(t)

	if err := service.RecordToolHistory(ToolHistory{Action: "格式化", Success: true, InputSnapshot: `{"input":"demo"}`}); err == nil {
		t.Fatalf("expected missing tool key error")
	}
	if err := service.RecordToolHistory(ToolHistory{ToolKey: "json", Success: true, InputSnapshot: `{"input":"demo"}`}); err == nil {
		t.Fatalf("expected missing action error")
	}
	if err := service.RecordToolHistory(ToolHistory{ToolKey: "json", Action: "格式化", Success: true}); err == nil {
		t.Fatalf("expected missing input snapshot error")
	}
}

func TestToolHistoryRejectsOversizedInputSnapshot(t *testing.T) {
	service := newTestDecryptService(t)

	err := service.RecordToolHistory(ToolHistory{
		ToolKey:       "json",
		Action:        "格式化",
		Success:       true,
		InputSnapshot: strings.Repeat("a", maxToolHistoryInputSnapshotBytes+1),
	})
	if err == nil {
		t.Fatalf("expected oversized input snapshot error")
	}
}

func TestToolHistoryTruncatesInputSummary(t *testing.T) {
	service := newTestDecryptService(t)
	longSummary := strings.Repeat("测", 130)

	if err := service.RecordToolHistory(ToolHistory{
		ToolKey:       "json",
		Action:        "格式化",
		Success:       true,
		InputSnapshot: `{"input":"demo"}`,
		InputSummary:  longSummary,
	}); err != nil {
		t.Fatalf("record tool history: %v", err)
	}

	got, err := service.GetToolHistory(10)
	if err != nil {
		t.Fatalf("get tool history: %v", err)
	}
	if len([]rune(got[0].InputSummary)) != 120 {
		t.Fatalf("summary length = %d, want 120", len([]rune(got[0].InputSummary)))
	}
}
