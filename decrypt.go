package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"

	"golang.org/x/crypto/pbkdf2"
)

type DecryptRequest struct {
	Environment string `json:"environment"`
	Data        string `json:"data"`
}

type DecryptResponse struct {
	Success     bool        `json:"success"`
	Data        interface{} `json:"data,omitempty"`
	Raw         string      `json:"raw,omitempty"`
	IsJSON      bool        `json:"isJson"`
	Environment string      `json:"environment"`
	Error       string      `json:"error,omitempty"`
}

func (a *App) Decrypt(req DecryptRequest) DecryptResponse {
	if req.Environment == "" || req.Data == "" {
		return DecryptResponse{
			Success: false,
			Error:   "请求参数不完整",
		}
	}

	config, err := a.service.GetConfig(req.Environment)
	if err != nil {
		return DecryptResponse{
			Success:     false,
			Error:       err.Error(),
			Environment: req.Environment,
		}
	}

	if config.Key == "" {
		return DecryptResponse{
			Success:     false,
			Error:       fmt.Sprintf("%s密钥未配置", config.Description),
			Environment: req.Environment,
		}
	}

	decrypted, err := decrypt(req.Data, config.Key)
	if err != nil {
		return DecryptResponse{
			Success:     false,
			Error:       err.Error(),
			Environment: req.Environment,
		}
	}

	var jsonData interface{}
	isJSON := false
	if json.Unmarshal([]byte(decrypted), &jsonData) == nil {
		isJSON = true
	}

	response := DecryptResponse{
		Success:     true,
		Raw:         decrypted,
		IsJSON:      isJSON,
		Environment: req.Environment,
	}

	if isJSON {
		response.Data = jsonData
	} else {
		response.Data = decrypted
	}

	return response
}

func decrypt(encryptedData, key string) (string, error) {
	if len(key) != 16 {
		return "", errors.New("密钥长度必须为16字节")
	}

	block, err := aes.NewCipher([]byte(key))
	if err != nil {
		return "", fmt.Errorf("创建cipher失败: %v", err)
	}

	ivLen := block.BlockSize()
	if len(encryptedData) < ivLen {
		return "", errors.New("加密数据长度不足")
	}

	iv := []byte(encryptedData[:ivLen])
	ciphertext := encryptedData[ivLen:]

	decoded, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("Base64解码失败: %v", err)
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	plaintext := make([]byte, len(decoded))
	mode.CryptBlocks(plaintext, decoded)

	plaintext, err = pkcs7Unpad(plaintext)
	if err != nil {
		return "", fmt.Errorf("解密失败，请检查密钥是否正确: %v", err)
	}

	return string(plaintext), nil
}

func createIV(key string) []byte {
	salt := make([]byte, 16)
	return pbkdf2.Key([]byte(key), salt, 1000, 16, sha256.New)
}

func pkcs7Unpad(data []byte) ([]byte, error) {
	length := len(data)
	if length == 0 {
		return nil, errors.New("数据为空")
	}
	padding := int(data[length-1])
	if padding > length || padding > aes.BlockSize {
		return nil, errors.New("无效的padding")
	}
	return data[:length-padding], nil
}
