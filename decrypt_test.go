package main

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"strings"
	"testing"
)

const legacyTestKey = "1234567890123456"
const legacyTestIV = "abcdefghijklmnop"

func buildLegacyEncryptedData(t *testing.T, plaintext string) string {
	t.Helper()
	return buildLegacyEncryptedPaddedData(t, pkcs7Pad([]byte(plaintext), aes.BlockSize))
}

func buildLegacyEncryptedPaddedData(t *testing.T, paddedPlaintext []byte) string {
	t.Helper()
	block, err := aes.NewCipher([]byte(legacyTestKey))
	if err != nil {
		t.Fatalf("create AES cipher: %v", err)
	}
	if len(paddedPlaintext) == 0 || len(paddedPlaintext)%aes.BlockSize != 0 {
		t.Fatalf("padded plaintext length = %d, want AES block multiple", len(paddedPlaintext))
	}
	ciphertext := make([]byte, len(paddedPlaintext))
	cipher.NewCBCEncrypter(block, []byte(legacyTestIV)).CryptBlocks(ciphertext, paddedPlaintext)
	return legacyTestIV + base64.StdEncoding.EncodeToString(ciphertext)
}

func TestDecryptReturnsSafeErrorWhenServiceIsNil(t *testing.T) {
	app := &App{}

	response := app.Decrypt(DecryptRequest{Environment: "test", Data: legacyTestIV + base64.StdEncoding.EncodeToString([]byte("short"))})

	if response.Success || response.Error != "配置服务未初始化" {
		t.Fatalf("response = %#v, want service initialization error", response)
	}
}

func TestDecryptDecryptsJSONResponse(t *testing.T) {
	app := newTestAppWithService(t)
	if err := app.service.SaveConfig(Config{Environment: "test", Key: legacyTestKey, Description: "测试环境"}); err != nil {
		t.Fatalf("save config: %v", err)
	}

	response := app.Decrypt(DecryptRequest{Environment: "test", Data: buildLegacyEncryptedData(t, `{"ok":true}`)})

	if !response.Success {
		t.Fatalf("decrypt failed: %s", response.Error)
	}
	if !response.IsJSON {
		t.Fatalf("isJSON = false, want true")
	}
	if response.Raw != `{"ok":true}` {
		t.Fatalf("raw = %q, want JSON plaintext", response.Raw)
	}
}

func TestDecryptRejectsCiphertextThatIsNotAESBlockMultiple(t *testing.T) {
	input := legacyTestIV + base64.StdEncoding.EncodeToString([]byte("short"))
	defer func() {
		if recovered := recover(); recovered != nil {
			t.Fatalf("decrypt panicked for malformed ciphertext: %v", recovered)
		}
	}()

	_, err := decrypt(input, legacyTestKey)

	if err == nil || !strings.Contains(err.Error(), "密文长度不是 AES block size 的倍数") {
		t.Fatalf("err = %v, want block size validation error", err)
	}
}

func TestDecryptRejectsZeroPKCS7Padding(t *testing.T) {
	paddedPlaintext := []byte("1234567890123456")
	paddedPlaintext[len(paddedPlaintext)-1] = 0

	_, err := decrypt(buildLegacyEncryptedPaddedData(t, paddedPlaintext), legacyTestKey)

	if err == nil || !strings.Contains(err.Error(), "无效的padding") {
		t.Fatalf("err = %v, want invalid padding error", err)
	}
}

func TestDecryptRejectsMismatchedPKCS7PaddingBytes(t *testing.T) {
	paddedPlaintext := []byte("1234567890123456")
	paddedPlaintext[len(paddedPlaintext)-1] = 4

	_, err := decrypt(buildLegacyEncryptedPaddedData(t, paddedPlaintext), legacyTestKey)

	if err == nil || !strings.Contains(err.Error(), "无效的padding") {
		t.Fatalf("err = %v, want invalid padding error", err)
	}
}

func TestDecryptRejectsInvalidBase64(t *testing.T) {
	_, err := decrypt(legacyTestIV+"not base64", legacyTestKey)

	if err == nil || !strings.Contains(err.Error(), "Base64解码失败") {
		t.Fatalf("err = %v, want base64 validation error", err)
	}
}
