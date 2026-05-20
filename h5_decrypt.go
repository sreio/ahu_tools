package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"strings"
)

type H5DecryptRequest struct {
	Environment string `json:"environment"`
	Mode        string `json:"mode"`
	Data        string `json:"data"`
}

type H5DecryptResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Raw     string      `json:"raw,omitempty"`
	IsJSON  bool        `json:"isJson"`
	Mode    string      `json:"mode,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type h5Payload struct {
	SecretKey   string `json:"secretKey"`
	EncryptData string `json:"encryptData"`
}

func (a *App) H5Decrypt(req H5DecryptRequest) H5DecryptResponse {
	if a.service == nil {
		return H5DecryptResponse{Success: false, Error: "配置服务未初始化"}
	}

	environment := strings.TrimSpace(req.Environment)
	if environment == "" {
		return H5DecryptResponse{Success: false, Error: "请选择 H5 配置环境"}
	}

	mode := strings.TrimSpace(req.Mode)
	if mode == "" {
		mode = "request"
	}
	if mode != "request" && mode != "response" {
		return H5DecryptResponse{Success: false, Error: "H5 解密模式无效"}
	}

	config, err := a.service.GetH5DecryptConfig(environment)
	if err != nil {
		return H5DecryptResponse{Success: false, Error: err.Error()}
	}

	decrypted, payloadMode, err := decryptH5Payload(req.Data, *config, mode)
	if err != nil {
		return H5DecryptResponse{Success: false, Mode: payloadMode, Error: err.Error()}
	}

	response := H5DecryptResponse{Success: true, Raw: decrypted, Mode: payloadMode}
	var jsonData interface{}
	if json.Unmarshal([]byte(decrypted), &jsonData) == nil {
		response.IsJSON = true
		response.Data = jsonData
	} else {
		response.Data = decrypted
	}
	return response
}

func decryptH5Payload(input string, config H5DecryptConfig, mode string) (string, string, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return "", "", errors.New("请输入 H5 加密数据")
	}

	var payload h5Payload
	if json.Unmarshal([]byte(input), &payload) == nil && strings.TrimSpace(payload.SecretKey) != "" && strings.TrimSpace(payload.EncryptData) != "" {
		decrypted, err := decryptH5JSONPayload(payload, config, mode)
		return decrypted, mode + "-payload", err
	}

	decrypted, err := decryptH5RawEncryptData(input, config, mode)
	return decrypted, mode + "-raw", err
}

func decryptH5JSONPayload(payload h5Payload, config H5DecryptConfig, mode string) (string, error) {
	privateKey, privateKeyName := selectH5PrivateKey(config, mode)
	if privateKey == "" {
		return "", fmt.Errorf("%s 未配置", privateKeyName)
	}

	aesKey, err := rsaPrivateDecryptBase64SecretKey(payload.SecretKey, privateKey, privateKeyName)
	if err != nil {
		return "", err
	}
	return aes256CBCDecryptEncryptData(payload.EncryptData, aesKey, "", selectH5AESKeyName(mode))
}

func decryptH5RawEncryptData(encryptData string, config H5DecryptConfig, mode string) (string, error) {
	aesKey, fallbackIV, aesKeyName := selectH5AESConfig(config, mode)
	if aesKey == "" {
		return "", fmt.Errorf("%s 未配置", aesKeyName)
	}
	return aes256CBCDecryptEncryptData(encryptData, []byte(aesKey), fallbackIV, aesKeyName)
}

func selectH5PrivateKey(config H5DecryptConfig, mode string) (string, string) {
	config = normalizeH5DecryptConfig(config)
	if mode == "response" {
		return config.ClientRSAPrivateKey, "CLIENT_RSA_PRIVATE_KEY"
	}
	return config.ServerRSAPrivateKey, "SERVER_RSA_PRIVATE_KEY"
}

func selectH5AESConfig(config H5DecryptConfig, mode string) (string, string, string) {
	config = normalizeH5DecryptConfig(config)
	if mode == "response" {
		return config.ResponseAES256CBCKey, config.ResponseAES256CBCIV, "响应 AES_256_CBC_KEY"
	}
	return config.RequestAES256CBCKey, config.RequestAES256CBCIV, "请求 AES_256_CBC_KEY"
}

func selectH5AESKeyName(mode string) string {
	if mode == "response" {
		return "响应 AES_256_CBC_KEY"
	}
	return "请求 AES_256_CBC_KEY"
}

func rsaPrivateDecryptBase64SecretKey(secretKey string, privateKeyPEM string, privateKeyName string) ([]byte, error) {
	secretKey = strings.TrimSpace(secretKey)
	decoded, err := base64.StdEncoding.DecodeString(secretKey)
	if err != nil {
		return nil, fmt.Errorf("secretKey Base64解码失败: %v", err)
	}

	privateKey, err := parsePEMPrivateKey(privateKeyPEM, privateKeyName)
	if err != nil {
		return nil, err
	}

	decrypted, err := rsa.DecryptPKCS1v15(nil, privateKey, decoded)
	if err != nil {
		return nil, fmt.Errorf("RSA解密失败: %v", err)
	}
	return decrypted, nil
}

func parsePEMPrivateKey(privateKeyPEM string, privateKeyName string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return nil, fmt.Errorf("%s 不是有效 PEM", privateKeyName)
	}

	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}

	parsedKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("%s 解析失败", privateKeyName)
	}
	privateKey, ok := parsedKey.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("%s 不是 RSA 私钥", privateKeyName)
	}
	return privateKey, nil
}

func aes256CBCDecryptEncryptData(encryptData string, aesKey []byte, fallbackIV string, aesKeyName string) (string, error) {
	if len(aesKey) != 32 {
		return "", fmt.Errorf("%s 必须为32字节", aesKeyName)
	}

	encryptData = strings.TrimSpace(encryptData)
	if len(encryptData) > aes.BlockSize {
		decrypted, err := decryptAES256CBCBase64(encryptData[aes.BlockSize:], aesKey, encryptData[:aes.BlockSize])
		if err == nil || fallbackIV == "" {
			return decrypted, err
		}
		if fallbackDecrypted, fallbackErr := decryptAES256CBCBase64(encryptData, aesKey, fallbackIV); fallbackErr == nil {
			return fallbackDecrypted, nil
		}
		return "", err
	}

	return decryptAES256CBCBase64(encryptData, aesKey, fallbackIV)
}

func decryptAES256CBCBase64(cipherText string, aesKey []byte, iv string) (string, error) {
	if len(iv) != aes.BlockSize {
		return "", errors.New("AES_256_CBC_IV 必须为16字节")
	}

	decoded, err := base64.StdEncoding.DecodeString(cipherText)
	if err != nil {
		return "", fmt.Errorf("encryptData Base64解码失败: %v", err)
	}
	if len(decoded) == 0 || len(decoded)%aes.BlockSize != 0 {
		return "", errors.New("encryptData 密文长度不是 AES block size 的倍数")
	}

	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return "", fmt.Errorf("创建AES cipher失败: %v", err)
	}

	plaintext := make([]byte, len(decoded))
	cipher.NewCBCDecrypter(block, []byte(iv)).CryptBlocks(plaintext, decoded)

	plaintext, err = pkcs7Unpad(plaintext)
	if err != nil {
		return "", fmt.Errorf("AES解密失败: %v", err)
	}
	return string(plaintext), nil
}
