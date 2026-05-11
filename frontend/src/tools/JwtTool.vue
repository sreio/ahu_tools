<template>
  <el-card class="tool-card" shadow="never">
    <template #header>
      <div class="tool-header">
        <div>
          <h2>JWT</h2>
          <p>解码、验签与 HMAC 签名生成。</p>
        </div>
        <div class="tool-header-actions">
          <el-button @click="$emit('open-history', 'jwt')">历史</el-button>
        </div>
      </div>
    </template>

    <el-alert
      title="这里的“加密/解密”按 JWT 常用工具语义实现为签名生成、解码与验签；不支持 JWE 加密/解密。"
      type="info"
      show-icon
      :closable="false"
      class="tool-feedback"
    />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="解密 / 验签" name="decode">
        <el-form label-position="top">
          <el-form-item label="JWT Token">
            <el-input v-model="input" type="textarea" :rows="8" placeholder="请输入 header.payload.signature" />
          </el-form-item>
          <el-form-item label="Secret">
            <el-input v-model="secret" type="password" show-password placeholder="验签时输入 HMAC secret" />
          </el-form-item>
        </el-form>

        <div class="action-row">
          <el-button type="primary" @click="runDecode">解密 Token</el-button>
          <el-button type="success" @click="runVerify">验签</el-button>
          <el-button @click="clearDecode">清空</el-button>
          <el-button :disabled="!input.trim()" @click="copyText(input, 'JWT Token')">复制 Token</el-button>
        </div>

        <el-alert v-if="decodeError" :title="decodeError" type="error" show-icon class="tool-feedback" />
        <el-alert v-if="decodeWarning" :title="decodeWarning" type="warning" show-icon class="tool-feedback" />

        <div v-if="header || payload" class="jwt-result-grid">
          <el-card class="result-container" shadow="never">
            <template #header>Header</template>
            <pre class="result-json">{{ header }}</pre>
            <div class="result-actions">
              <el-button size="small" @click="copyText(header, 'JWT Header')">复制 Header</el-button>
            </div>
          </el-card>

          <el-card class="result-container" shadow="never">
            <template #header>Payload</template>
            <pre class="result-json">{{ payload }}</pre>
            <div class="result-actions">
              <el-button size="small" @click="copyText(payload, 'JWT Payload')">复制 Payload</el-button>
            </div>
          </el-card>

          <el-card class="result-container" shadow="never">
            <template #header>Signature</template>
            <pre class="result-json">{{ signature }}</pre>
            <div class="result-actions">
              <el-button size="small" @click="copyText(signature, 'JWT Signature')">复制 Signature</el-button>
            </div>
          </el-card>

          <el-card class="result-container" shadow="never">
            <template #header>Verification</template>
            <div class="result-meta">
              <strong>Algorithm</strong>
              <span>{{ algorithm || '未声明' }}</span>
            </div>
            <div class="result-meta">
              <strong>状态</strong>
              <el-tag :type="verification.type">{{ verification.message }}</el-tag>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="加密 / 签名" name="sign">
        <el-form label-position="top">
          <el-form-item label="Algorithm">
            <el-select v-model="signAlgorithm" class="full-width">
              <el-option label="HS256" value="HS256" />
              <el-option label="HS384" value="HS384" />
              <el-option label="HS512" value="HS512" />
            </el-select>
          </el-form-item>
          <el-form-item label="Header JSON">
            <el-input v-model="signHeader" type="textarea" :rows="5" />
          </el-form-item>
          <el-form-item label="Payload JSON">
            <el-input v-model="signPayload" type="textarea" :rows="7" />
          </el-form-item>
          <el-form-item label="Secret">
            <el-input v-model="signSecret" type="password" show-password placeholder="请输入 HMAC secret" />
          </el-form-item>
        </el-form>

        <div class="action-row">
          <el-button type="primary" @click="runSign">生成 Token</el-button>
          <el-button :disabled="!outputToken" @click="copyText(outputToken, 'JWT Token')">复制 Token</el-button>
          <el-button @click="clearSign">清空</el-button>
        </div>

        <el-alert v-if="signError" :title="signError" type="error" show-icon class="tool-feedback" />

        <el-card v-if="outputToken" class="result-container" shadow="never">
          <template #header>签名结果</template>
          <pre class="result-json">{{ outputToken }}</pre>
          <div class="result-meta">
            <strong>Algorithm</strong>
            <span>{{ signResult.algorithm }}</span>
          </div>
          <div class="result-meta">
            <strong>Signature</strong>
            <span>{{ signResult.signature }}</span>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script>
import { decodeJwt, signJwt, verifyJwt } from '../utils/devTools'
import { copyToolOutput, emitToolAction, summarizeText } from './toolUi'

const defaultSignHeader = '{\n  "typ": "JWT"\n}'
const defaultSignPayload = '{\n  "sub": "123",\n  "name": "AhuTools",\n  "iat": 1704067200\n}'

export default {
  name: 'JwtTool',
  props: {
    historyRestore: {
      type: Object,
      default: null,
    },
  },
  emits: ['toast', 'tool-action', 'open-history'],
  data() {
    return {
      activeTab: 'decode',
      input: '',
      secret: '',
      header: '',
      payload: '',
      signature: '',
      algorithm: '',
      verification: { type: 'info', message: '未验签' },
      decodeError: '',
      decodeWarning: '',
      signAlgorithm: 'HS256',
      signHeader: defaultSignHeader,
      signPayload: defaultSignPayload,
      signSecret: '',
      outputToken: '',
      signResult: null,
      signError: '',
    }
  },
  watch: {
    historyRestore(newValue, oldValue) {
      if (newValue?.toolKey !== 'jwt' || newValue.id === oldValue?.id) return
      const snapshot = newValue.inputSnapshot || newValue.snapshot || {}
      this.activeTab = snapshot.activeTab || 'decode'
      this.input = snapshot.input || ''
      this.secret = snapshot.secret || ''
      this.signAlgorithm = snapshot.signAlgorithm || 'HS256'
      this.signHeader = snapshot.signHeader || defaultSignHeader
      this.signPayload = snapshot.signPayload || defaultSignPayload
      this.signSecret = snapshot.signSecret || ''
      this.decodeError = ''
      this.decodeWarning = ''
      this.signError = ''
      this.outputToken = ''
      this.signResult = null
      this.clearDecodedFields()
    },
  },
  methods: {
    inputSnapshot() {
      return {
        activeTab: this.activeTab,
        input: this.input,
        secret: this.secret,
        signAlgorithm: this.signAlgorithm,
        signHeader: this.signHeader,
        signPayload: this.signPayload,
        signSecret: this.signSecret,
      }
    },
    emitToolAction(action, success, snapshot = this.inputSnapshot()) {
      emitToolAction(this, {
        toolKey: 'jwt',
        action,
        success,
        inputSnapshot: snapshot,
        inputSummary: snapshot.activeTab === 'decode'
          ? `decode · ${summarizeText(snapshot.input)}`
          : `sign · ${snapshot.signAlgorithm}`,
      })
    },
    applyDecodedResult(value, verification) {
      this.header = value.header
      this.payload = value.payload
      this.signature = value.signature
      this.algorithm = value.algorithm
      this.verification = verification
      this.decodeError = ''
      this.decodeWarning = [value.headerError, value.payloadError].filter(Boolean).join('；')
    },
    clearDecodedFields() {
      this.header = ''
      this.payload = ''
      this.signature = ''
      this.algorithm = ''
      this.verification = { type: 'info', message: '未验签' }
      this.decodeWarning = ''
    },
    runDecode() {
      const result = decodeJwt(this.input)
      if (result.ok) {
        this.applyDecodedResult(result.value, { type: 'info', message: '未验签' })
      } else {
        this.clearDecodedFields()
        this.decodeError = result.error
      }
      this.emitToolAction('Decode', result.ok)
    },
    async runVerify() {
      const result = await verifyJwt({ token: this.input, secret: this.secret })
      if (result.ok) {
        this.applyDecodedResult(result.value, {
          type: result.value.valid ? 'success' : 'danger',
          message: result.value.valid ? '验签通过' : '验签失败',
        })
      } else {
        this.clearDecodedFields()
        this.decodeError = result.error
      }
      this.emitToolAction('Verify', result.ok && result.value.valid)
    },
    async runSign() {
      const snapshot = this.inputSnapshot()
      const result = await signJwt({
        header: this.signHeader,
        payload: this.signPayload,
        secret: this.signSecret,
        algorithm: this.signAlgorithm,
      })
      if (result.ok) {
        this.outputToken = result.value.token
        this.signHeader = result.value.header
        this.signPayload = result.value.payload
        this.signResult = result.value
        this.signError = ''
      } else {
        this.outputToken = ''
        this.signResult = null
        this.signError = result.error
      }
      this.emitToolAction('Sign', result.ok, snapshot)
    },
    clearDecode() {
      this.input = ''
      this.secret = ''
      this.decodeError = ''
      this.decodeWarning = ''
      this.clearDecodedFields()
    },
    clearSign() {
      this.signAlgorithm = 'HS256'
      this.signHeader = defaultSignHeader
      this.signPayload = defaultSignPayload
      this.signSecret = ''
      this.outputToken = ''
      this.signResult = null
      this.signError = ''
    },
    async copyText(text, label) {
      await copyToolOutput(this, text, label)
    },
  },
}
</script>
