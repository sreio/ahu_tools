package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Config struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Environment string `gorm:"uniqueIndex;not null" json:"environment"`
	Key         string `gorm:"not null" json:"key"`
	Description string `json:"description"`
}

type DecryptService struct {
	db *gorm.DB
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

	dbPath := filepath.Join(dbDir, "config.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("打开数据库失败: %v", err)
	}

	if err := db.AutoMigrate(&Config{}); err != nil {
		return nil, fmt.Errorf("数据库迁移失败: %v", err)
	}

	service := &DecryptService{db: db}
	
	// 初始化默认配置
	service.initDefaultConfigs()

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

func (a *App) GetAllConfigs() ([]Config, error) {
	return a.service.GetAllConfigs()
}

func (a *App) SaveConfig(config Config) error {
	return a.service.SaveConfig(config)
}

func (a *App) DeleteConfig(environment string) error {
	return a.service.DeleteConfig(environment)
}
