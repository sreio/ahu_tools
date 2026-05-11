package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Config struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Environment string `gorm:"uniqueIndex;not null" json:"environment"`
	Key         string `gorm:"not null" json:"key"`
	Description string `json:"description"`
}

type ToolOrder struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	ToolKey  string `gorm:"uniqueIndex;not null" json:"toolKey"`
	Position int    `gorm:"not null" json:"position"`
}

type ToolHistory struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	ToolKey       string    `gorm:"index;not null" json:"toolKey"`
	Action        string    `gorm:"not null" json:"action"`
	Success       bool      `gorm:"not null" json:"success"`
	InputSnapshot string    `gorm:"not null" json:"inputSnapshot"`
	InputSummary  string    `json:"inputSummary"`
	SchemaVersion int       `gorm:"not null;default:1" json:"schemaVersion"`
	CreatedAt     time.Time `gorm:"index" json:"createdAt"`
}

type H5DecryptConfig struct {
	ID                   uint   `gorm:"primaryKey" json:"id"`
	Environment          string `gorm:"uniqueIndex" json:"environment"`
	Description          string `json:"description"`
	RequestAES256CBCIV   string `json:"request_aes_256_cbc_iv"`
	RequestAES256CBCKey  string `json:"request_aes_256_cbc_key"`
	ServerRSAPrivateKey  string `json:"server_rsa_private_key"`
	ResponseAES256CBCIV  string `json:"response_aes_256_cbc_iv"`
	ResponseAES256CBCKey string `json:"response_aes_256_cbc_key"`
	ClientRSAPrivateKey  string `json:"client_rsa_private_key"`
}

const maxToolHistoryInputSnapshotBytes = 20 * 1024

type DecryptService struct {
	db *gorm.DB
}

func migrateLegacyToolHistory(db *gorm.DB) error {
	migrator := db.Migrator()
	if migrator.HasTable(&ToolHistory{}) && !migrator.HasColumn(&ToolHistory{}, "InputSnapshot") {
		return migrator.DropTable(&ToolHistory{})
	}
	return nil
}

func resetLegacyH5DecryptConfig(db *gorm.DB) error {
	migrator := db.Migrator()
	if !migrator.HasTable(&H5DecryptConfig{}) || migrator.HasColumn(&H5DecryptConfig{}, "RequestAES256CBCKey") {
		return nil
	}
	return migrator.DropTable(&H5DecryptConfig{})
}

func NewDecryptService() (*DecryptService, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("获取用户目录失败: %v", err)
	}

	dbDir := filepath.Join(homeDir, ".ahutools")
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, fmt.Errorf("创建配置目录失败: %v", err)
	}

	return newDecryptServiceWithDBPath(filepath.Join(dbDir, "config.db"))
}

func newDecryptServiceWithDBPath(dbPath string) (*DecryptService, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("打开数据库失败: %v", err)
	}

	if err := migrateLegacyToolHistory(db); err != nil {
		return nil, fmt.Errorf("历史记录迁移失败: %v", err)
	}
	if err := resetLegacyH5DecryptConfig(db); err != nil {
		return nil, fmt.Errorf("H5配置重置失败: %v", err)
	}
	if err := db.AutoMigrate(&Config{}, &ToolOrder{}, &ToolHistory{}, &H5DecryptConfig{}); err != nil {
		return nil, fmt.Errorf("数据库迁移失败: %v", err)
	}

	service := &DecryptService{db: db}
	service.initDefaultConfigs()
	service.initDefaultH5DecryptConfigs()

	return service, nil
}

func (s *DecryptService) initDefaultConfigs() {
	configs := []Config{
		{Environment: "test", Key: "", Description: "测试环境"},
		{Environment: "production", Key: "", Description: "生产环境"},
	}

	for _, config := range configs {
		var existing Config
		result := s.db.Where("environment = ?", config.Environment).First(&existing)
		if result.Error == gorm.ErrRecordNotFound {
			s.db.Create(&config)
		}
	}
}

func (s *DecryptService) initDefaultH5DecryptConfigs() {
	configs := []H5DecryptConfig{
		{Environment: "test", Description: "测试环境"},
		{Environment: "production", Description: "生产环境"},
	}
	for _, config := range configs {
		var existing H5DecryptConfig
		result := s.db.Where("environment = ?", config.Environment).First(&existing)
		if result.Error == gorm.ErrRecordNotFound {
			s.db.Create(&config)
		}
	}
}

func (s *DecryptService) GetConfig(environment string) (*Config, error) {
	var config Config
	result := s.db.Where("environment = ?", environment).First(&config)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, errors.New("环境配置不存在")
		}
		return nil, result.Error
	}
	return &config, nil
}

func (s *DecryptService) GetAllConfigs() ([]Config, error) {
	var configs []Config
	result := s.db.Find(&configs)
	if result.Error != nil {
		return nil, result.Error
	}
	return configs, nil
}

func (s *DecryptService) SaveConfig(config Config) error {
	if config.Environment == "" {
		return errors.New("环境名称不能为空")
	}
	if len(config.Key) != 16 && config.Key != "" {
		return errors.New("密钥长度必须为16字节")
	}

	var existing Config
	result := s.db.Where("environment = ?", config.Environment).First(&existing)

	if result.Error == gorm.ErrRecordNotFound {
		return s.db.Create(&config).Error
	}

	existing.Key = config.Key
	existing.Description = config.Description
	return s.db.Save(&existing).Error
}

func (s *DecryptService) DeleteConfig(environment string) error {
	return s.db.Where("environment = ?", environment).Delete(&Config{}).Error
}

func (s *DecryptService) GetToolOrder() ([]string, error) {
	var orders []ToolOrder
	if err := s.db.Order("position ASC").Find(&orders).Error; err != nil {
		return nil, err
	}

	toolKeys := make([]string, 0, len(orders))
	for _, order := range orders {
		toolKeys = append(toolKeys, order.ToolKey)
	}
	return toolKeys, nil
}

func (s *DecryptService) SaveToolOrder(toolKeys []string) error {
	seen := make(map[string]bool, len(toolKeys))
	orders := make([]ToolOrder, 0, len(toolKeys))
	for _, toolKey := range toolKeys {
		if toolKey == "" || seen[toolKey] {
			continue
		}
		seen[toolKey] = true
		orders = append(orders, ToolOrder{ToolKey: toolKey, Position: len(orders)})
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&ToolOrder{}).Error; err != nil {
			return err
		}
		for _, order := range orders {
			if err := tx.Create(&order).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *DecryptService) RecordToolHistory(entry ToolHistory) error {
	entry.ToolKey = strings.TrimSpace(entry.ToolKey)
	entry.Action = strings.TrimSpace(entry.Action)
	entry.InputSummary = strings.TrimSpace(entry.InputSummary)
	if entry.ToolKey == "" {
		return errors.New("工具标识不能为空")
	}
	if entry.Action == "" {
		return errors.New("操作名称不能为空")
	}
	if entry.InputSnapshot == "" {
		return errors.New("输入历史不能为空")
	}
	if len([]byte(entry.InputSnapshot)) > maxToolHistoryInputSnapshotBytes {
		return errors.New("输入历史内容过长")
	}

	actionRunes := []rune(entry.Action)
	if len(actionRunes) > 80 {
		entry.Action = string(actionRunes[:80])
	}
	summaryRunes := []rune(entry.InputSummary)
	if len(summaryRunes) > 120 {
		entry.InputSummary = string(summaryRunes[:120])
	}
	if entry.SchemaVersion <= 0 {
		entry.SchemaVersion = 1
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now()
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&entry).Error; err != nil {
			return err
		}

		var staleIDs []uint
		if err := tx.Model(&ToolHistory{}).
			Order("created_at DESC, id DESC").
			Offset(200).
			Pluck("id", &staleIDs).Error; err != nil {
			return err
		}
		if len(staleIDs) == 0 {
			return nil
		}
		return tx.Delete(&ToolHistory{}, staleIDs).Error
	})
}

func (s *DecryptService) GetToolHistory(limit int) ([]ToolHistory, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	var history []ToolHistory
	if err := s.db.Order("created_at DESC, id DESC").Limit(limit).Find(&history).Error; err != nil {
		return nil, err
	}
	return history, nil
}

func (s *DecryptService) ClearToolHistory() error {
	return s.db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&ToolHistory{}).Error
}

func (s *DecryptService) GetAllH5DecryptConfigs() ([]H5DecryptConfig, error) {
	var configs []H5DecryptConfig
	result := s.db.Order("id ASC").Find(&configs)
	if result.Error != nil {
		return nil, result.Error
	}
	return configs, nil
}

func (s *DecryptService) GetH5DecryptConfig(environment string) (*H5DecryptConfig, error) {
	var config H5DecryptConfig
	result := s.db.Where("environment = ?", environment).First(&config)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, errors.New("H5环境配置不存在")
		}
		return nil, result.Error
	}
	return &config, nil
}

func (s *DecryptService) SaveH5DecryptConfig(config H5DecryptConfig) error {
	config.Environment = strings.TrimSpace(config.Environment)
	if config.Environment == "" {
		return errors.New("H5环境标识不能为空")
	}
	if config.RequestAES256CBCIV != "" && len(config.RequestAES256CBCIV) != 16 {
		return errors.New("请求 AES_256_CBC_IV 必须为16字节")
	}
	if config.RequestAES256CBCKey != "" && len(config.RequestAES256CBCKey) != 32 {
		return errors.New("请求 AES_256_CBC_KEY 必须为32字节")
	}
	if config.ResponseAES256CBCIV != "" && len(config.ResponseAES256CBCIV) != 16 {
		return errors.New("响应 AES_256_CBC_IV 必须为16字节")
	}
	if config.ResponseAES256CBCKey != "" && len(config.ResponseAES256CBCKey) != 32 {
		return errors.New("响应 AES_256_CBC_KEY 必须为32字节")
	}

	var existing H5DecryptConfig
	result := s.db.Where("environment = ?", config.Environment).First(&existing)
	if result.Error == gorm.ErrRecordNotFound {
		return s.db.Create(&config).Error
	}
	if result.Error != nil {
		return result.Error
	}

	existing.Description = config.Description
	existing.RequestAES256CBCIV = config.RequestAES256CBCIV
	existing.RequestAES256CBCKey = config.RequestAES256CBCKey
	existing.ServerRSAPrivateKey = config.ServerRSAPrivateKey
	existing.ResponseAES256CBCIV = config.ResponseAES256CBCIV
	existing.ResponseAES256CBCKey = config.ResponseAES256CBCKey
	existing.ClientRSAPrivateKey = config.ClientRSAPrivateKey
	return s.db.Save(&existing).Error
}

func (a *App) GetAllConfigs() ([]Config, error) {
	if a.service == nil {
		return nil, errors.New("配置服务未初始化")
	}
	return a.service.GetAllConfigs()
}

func (a *App) SaveConfig(config Config) error {
	if a.service == nil {
		return errors.New("配置服务未初始化")
	}
	return a.service.SaveConfig(config)
}

func (a *App) DeleteConfig(environment string) error {
	if a.service == nil {
		return errors.New("配置服务未初始化")
	}
	return a.service.DeleteConfig(environment)
}

func (a *App) GetToolOrder() ([]string, error) {
	if a.service == nil {
		return nil, errors.New("配置服务未初始化")
	}
	return a.service.GetToolOrder()
}

func (a *App) SaveToolOrder(toolKeys []string) error {
	if a.service == nil {
		return errors.New("配置服务未初始化")
	}
	return a.service.SaveToolOrder(toolKeys)
}

func (a *App) RecordToolHistory(entry ToolHistory) error {
	if a.service == nil {
		return errors.New("配置服务未初始化")
	}
	return a.service.RecordToolHistory(entry)
}

func (a *App) GetToolHistory(limit int) ([]ToolHistory, error) {
	if a.service == nil {
		return nil, errors.New("配置服务未初始化")
	}
	return a.service.GetToolHistory(limit)
}

func (a *App) ClearToolHistory() error {
	if a.service == nil {
		return errors.New("配置服务未初始化")
	}
	return a.service.ClearToolHistory()
}

func (a *App) GetAllH5DecryptConfigs() ([]H5DecryptConfig, error) {
	if a.service == nil {
		return nil, errors.New("配置服务未初始化")
	}
	return a.service.GetAllH5DecryptConfigs()
}

func (a *App) SaveH5DecryptConfig(config H5DecryptConfig) error {
	if a.service == nil {
		return errors.New("配置服务未初始化")
	}
	return a.service.SaveH5DecryptConfig(config)
}
