package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"strings"
	"testing"
)

const h5TestAESKey = "12345678901234567890123456789012"
const h5TestIV = "abcdefghijklmnop"

func newTestAppWithService(t *testing.T) *App {
	t.Helper()
	return &App{service: newTestDecryptService(t)}
}

func generateH5TestKeys(t *testing.T) (*rsa.PrivateKey, string) {
	t.Helper()
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate RSA key: %v", err)
	}
	privatePEM := string(pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(privateKey)}))
	return privateKey, privatePEM
}

func buildH5EncryptedData(t *testing.T, plaintext string, aesKey string, iv string, includeIV bool) string {
	t.Helper()
	block, err := aes.NewCipher([]byte(aesKey))
	if err != nil {
		t.Fatalf("create AES cipher: %v", err)
	}
	padded := pkcs7Pad([]byte(plaintext), aes.BlockSize)
	ciphertext := make([]byte, len(padded))
	cipher.NewCBCEncrypter(block, []byte(iv)).CryptBlocks(ciphertext, padded)
	encoded := base64.StdEncoding.EncodeToString(ciphertext)
	if includeIV {
		return iv + encoded
	}
	return encoded
}

func buildH5Payload(t *testing.T, plaintext string, aesKey string, iv string, publicKey *rsa.PublicKey) string {
	t.Helper()
	secretKey, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, []byte(aesKey))
	if err != nil {
		t.Fatalf("encrypt secret key: %v", err)
	}
	payload := map[string]string{
		"secretKey":   base64.StdEncoding.EncodeToString(secretKey),
		"encryptData": buildH5EncryptedData(t, plaintext, aesKey, iv, true),
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal h5 payload: %v", err)
	}
	return string(encoded)
}

func pkcs7Pad(data []byte, blockSize int) []byte {
	padding := blockSize - len(data)%blockSize
	padded := make([]byte, len(data)+padding)
	copy(padded, data)
	for index := len(data); index < len(padded); index++ {
		padded[index] = byte(padding)
	}
	return padded
}

func TestH5DecryptRequestPayloadModeDecryptsJSON(t *testing.T) {
	app := newTestAppWithService(t)
	privateKey, privatePEM := generateH5TestKeys(t)
	if err := app.service.SaveH5DecryptConfig(H5DecryptConfig{Environment: "test", ServerRSAPrivateKey: privatePEM}); err != nil {
		t.Fatalf("save h5 config: %v", err)
	}
	plaintext := `{"router":"openapi/toAhykApi","projectType":"demo","p":{"userId":10001,"courseId":20002}}`

	response := app.H5Decrypt(H5DecryptRequest{Environment: "test", Mode: "request", Data: buildH5Payload(t, plaintext, h5TestAESKey, h5TestIV, &privateKey.PublicKey)})

	if !response.Success {
		t.Fatalf("h5 decrypt failed: %s", response.Error)
	}
	if response.Mode != "request-payload" {
		t.Fatalf("mode = %q, want request-payload", response.Mode)
	}
	if !response.IsJSON {
		t.Fatalf("isJSON = false, want true")
	}
	if response.Raw != plaintext {
		t.Fatalf("raw = %q, want %q", response.Raw, plaintext)
	}
}

func TestH5DecryptResponsePayloadModeDecryptsJSON(t *testing.T) {
	app := newTestAppWithService(t)
	privateKey, privatePEM := generateH5TestKeys(t)
	if err := app.service.SaveH5DecryptConfig(H5DecryptConfig{Environment: "test", ClientRSAPrivateKey: privatePEM}); err != nil {
		t.Fatalf("save h5 config: %v", err)
	}
	plaintext := `{"code":0,"data":{"ok":true,"message":"响应成功"}}`

	response := app.H5Decrypt(H5DecryptRequest{Environment: "test", Mode: "response", Data: buildH5Payload(t, plaintext, h5TestAESKey, h5TestIV, &privateKey.PublicKey)})

	if !response.Success {
		t.Fatalf("h5 response decrypt failed: %s", response.Error)
	}
	if response.Mode != "response-payload" {
		t.Fatalf("mode = %q, want response-payload", response.Mode)
	}
	if !response.IsJSON {
		t.Fatalf("isJSON = false, want true")
	}
	if response.Raw != plaintext {
		t.Fatalf("raw = %q, want %q", response.Raw, plaintext)
	}
}

func TestH5DecryptRequestRawModeUsesConfiguredAESKey(t *testing.T) {
	app := newTestAppWithService(t)
	if err := app.service.SaveH5DecryptConfig(H5DecryptConfig{Environment: "test", RequestAES256CBCKey: h5TestAESKey}); err != nil {
		t.Fatalf("save h5 config: %v", err)
	}
	encryptData := buildH5EncryptedData(t, `plain text`, h5TestAESKey, h5TestIV, true)

	response := app.H5Decrypt(H5DecryptRequest{Environment: "test", Mode: "request", Data: encryptData})

	if !response.Success {
		t.Fatalf("h5 raw decrypt failed: %s", response.Error)
	}
	if response.Mode != "request-raw" {
		t.Fatalf("mode = %q, want request-raw", response.Mode)
	}
	if response.Raw != "plain text" {
		t.Fatalf("raw = %q, want plain text", response.Raw)
	}
}

func TestH5DecryptResponseRawModeUsesConfiguredAESKey(t *testing.T) {
	app := newTestAppWithService(t)
	if err := app.service.SaveH5DecryptConfig(H5DecryptConfig{Environment: "test", ResponseAES256CBCKey: h5TestAESKey}); err != nil {
		t.Fatalf("save h5 config: %v", err)
	}
	encryptData := buildH5EncryptedData(t, `response text`, h5TestAESKey, h5TestIV, true)

	response := app.H5Decrypt(H5DecryptRequest{Environment: "test", Mode: "response", Data: encryptData})

	if !response.Success {
		t.Fatalf("h5 response raw decrypt failed: %s", response.Error)
	}
	if response.Mode != "response-raw" {
		t.Fatalf("mode = %q, want response-raw", response.Mode)
	}
	if response.Raw != "response text" {
		t.Fatalf("raw = %q, want response text", response.Raw)
	}
}

func TestH5DecryptRawModeUsesConfiguredFallbackIV(t *testing.T) {
	app := newTestAppWithService(t)
	if err := app.service.SaveH5DecryptConfig(H5DecryptConfig{Environment: "test", RequestAES256CBCIV: h5TestIV, RequestAES256CBCKey: h5TestAESKey}); err != nil {
		t.Fatalf("save h5 config: %v", err)
	}
	encryptData := buildH5EncryptedData(t, `fallback iv`, h5TestAESKey, h5TestIV, false)

	response := app.H5Decrypt(H5DecryptRequest{Environment: "test", Data: encryptData})

	if !response.Success {
		t.Fatalf("h5 raw fallback decrypt failed: %s", response.Error)
	}
	if response.Mode != "request-raw" {
		t.Fatalf("mode = %q, want request-raw", response.Mode)
	}
	if response.Raw != "fallback iv" {
		t.Fatalf("raw = %q, want fallback iv", response.Raw)
	}
}

func TestH5DecryptRawModeTrimsConfiguredAESKeyAndIV(t *testing.T) {
	encryptData := buildH5EncryptedData(t, `trimmed config`, h5TestAESKey, h5TestIV, false)

	decrypted, err := decryptH5RawEncryptData(encryptData, H5DecryptConfig{
		RequestAES256CBCIV:  " " + h5TestIV + " ",
		RequestAES256CBCKey: " " + h5TestAESKey + " ",
	}, "request")

	if err != nil {
		t.Fatalf("decrypt with whitespace padded config: %v", err)
	}
	if decrypted != "trimmed config" {
		t.Fatalf("decrypted = %q, want trimmed config", decrypted)
	}
}

func TestH5DecryptPayloadModeRequiresModePrivateKey(t *testing.T) {
	app := newTestAppWithService(t)
	privateKey, _ := generateH5TestKeys(t)

	requestResponse := app.H5Decrypt(H5DecryptRequest{Environment: "test", Mode: "request", Data: buildH5Payload(t, "demo", h5TestAESKey, h5TestIV, &privateKey.PublicKey)})
	if requestResponse.Success || !strings.Contains(requestResponse.Error, "SERVER_RSA_PRIVATE_KEY 未配置") {
		t.Fatalf("request response = %#v, want missing server private key error", requestResponse)
	}

	responseResponse := app.H5Decrypt(H5DecryptRequest{Environment: "test", Mode: "response", Data: buildH5Payload(t, "demo", h5TestAESKey, h5TestIV, &privateKey.PublicKey)})
	if responseResponse.Success || !strings.Contains(responseResponse.Error, "CLIENT_RSA_PRIVATE_KEY 未配置") {
		t.Fatalf("response response = %#v, want missing client private key error", responseResponse)
	}
}

func TestH5DecryptRejectsInvalidInputs(t *testing.T) {
	app := newTestAppWithService(t)
	if err := app.service.SaveH5DecryptConfig(H5DecryptConfig{Environment: "test", RequestAES256CBCKey: h5TestAESKey}); err != nil {
		t.Fatalf("save h5 config: %v", err)
	}

	cases := []struct {
		name  string
		input string
		want  string
	}{
		{name: "empty", input: "", want: "请输入 H5 加密数据"},
		{name: "bad base64", input: h5TestIV + "not base64", want: "encryptData Base64解码失败"},
		{name: "unaligned ciphertext", input: h5TestIV + base64.StdEncoding.EncodeToString([]byte("short")), want: "encryptData 密文长度不是 AES block size 的倍数"},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			response := app.H5Decrypt(H5DecryptRequest{Environment: "test", Data: tt.input})
			if response.Success || !strings.Contains(response.Error, tt.want) {
				t.Fatalf("response = %#v, want error containing %q", response, tt.want)
			}
		})
	}
}

func TestH5DecryptRejectsInvalidModePrivateKeyAndAESKey(t *testing.T) {
	if _, err := parsePEMPrivateKey("bad pem", "CLIENT_RSA_PRIVATE_KEY"); err == nil {
		t.Fatalf("expected invalid PEM error")
	}
	if _, err := aes256CBCDecryptEncryptData(h5TestIV+base64.StdEncoding.EncodeToString([]byte("0123456789abcdef")), []byte("short"), "", "响应 AES_256_CBC_KEY"); err == nil {
		t.Fatalf("expected invalid AES key error")
	}
}
