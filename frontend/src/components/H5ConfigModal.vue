<template>
  <el-dialog
    :model-value="modelValue"
    title="H5 解密配置"
    width="920px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-alert
      title="H5 数据解密使用独立环境配置，并按请求解密、响应解密分别保存配置。"
      type="info"
      show-icon
      :closable="false"
      class="tool-feedback"
    />

    <div class="config-list">
      <el-card v-for="config in editableConfigs" :key="config.environment" class="config-card" shadow="never">
        <template #header>
          <div class="config-card-header">
            <span>{{ config.description || config.environment }}</span>
            <el-tag>{{ config.environment }}</el-tag>
          </div>
        </template>
        <el-form label-position="top">
          <el-form-item label="描述">
            <el-input v-model="config.description" placeholder="请输入环境描述" />
          </el-form-item>

          <el-divider content-position="left">请求解密配置</el-divider>
          <el-form-item label="请求 AES_256_CBC_IV（16字节，可选）">
            <el-input v-model="config.request_aes_256_cbc_iv" placeholder="请输入请求解密16字节 IV" />
          </el-form-item>
          <el-form-item label="请求 AES_256_CBC_KEY（32字节，可选）">
            <el-input v-model="config.request_aes_256_cbc_key" placeholder="请输入请求解密32字节 AES key" />
          </el-form-item>
          <el-form-item label="SERVER_RSA_PRIVATE_KEY（请求 Payload 模式必填）">
            <el-input
              v-model="config.server_rsa_private_key"
              type="textarea"
              :rows="6"
              placeholder="请输入服务端 RSA 私钥 PEM"
            />
          </el-form-item>

          <el-divider content-position="left">响应解密配置</el-divider>
          <el-form-item label="响应 AES_256_CBC_IV（16字节，可选）">
            <el-input v-model="config.response_aes_256_cbc_iv" placeholder="请输入响应解密16字节 IV" />
          </el-form-item>
          <el-form-item label="响应 AES_256_CBC_KEY（32字节，可选）">
            <el-input v-model="config.response_aes_256_cbc_key" placeholder="请输入响应解密32字节 AES key" />
          </el-form-item>
          <el-form-item label="CLIENT_RSA_PRIVATE_KEY（响应 Payload 模式必填）">
            <el-input
              v-model="config.client_rsa_private_key"
              type="textarea"
              :rows="6"
              placeholder="请输入客户端 RSA 私钥 PEM"
            />
          </el-form-item>

          <el-button type="primary" @click="$emit('save', { ...config })">保存配置</el-button>
        </el-form>
      </el-card>
    </div>

    <el-card class="config-card" shadow="never">
      <template #header>添加 H5 环境</template>
      <el-form label-position="top">
        <el-form-item label="环境标识">
          <el-input v-model="newConfig.environment" placeholder="例如: staging" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newConfig.description" placeholder="例如: 预发布环境" />
        </el-form-item>

        <el-divider content-position="left">请求解密配置</el-divider>
        <el-form-item label="请求 AES_256_CBC_IV（16字节，可选）">
          <el-input v-model="newConfig.request_aes_256_cbc_iv" placeholder="请输入请求解密16字节 IV" />
        </el-form-item>
        <el-form-item label="请求 AES_256_CBC_KEY（32字节，可选）">
          <el-input v-model="newConfig.request_aes_256_cbc_key" placeholder="请输入请求解密32字节 AES key" />
        </el-form-item>
        <el-form-item label="SERVER_RSA_PRIVATE_KEY（请求 Payload 模式必填）">
          <el-input
            v-model="newConfig.server_rsa_private_key"
            type="textarea"
            :rows="6"
            placeholder="请输入服务端 RSA 私钥 PEM"
          />
        </el-form-item>

        <el-divider content-position="left">响应解密配置</el-divider>
        <el-form-item label="响应 AES_256_CBC_IV（16字节，可选）">
          <el-input v-model="newConfig.response_aes_256_cbc_iv" placeholder="请输入响应解密16字节 IV" />
        </el-form-item>
        <el-form-item label="响应 AES_256_CBC_KEY（32字节，可选）">
          <el-input v-model="newConfig.response_aes_256_cbc_key" placeholder="请输入响应解密32字节 AES key" />
        </el-form-item>
        <el-form-item label="CLIENT_RSA_PRIVATE_KEY（响应 Payload 模式必填）">
          <el-input
            v-model="newConfig.client_rsa_private_key"
            type="textarea"
            :rows="6"
            placeholder="请输入客户端 RSA 私钥 PEM"
          />
        </el-form-item>
        <el-button type="success" @click="addConfig">添加环境</el-button>
      </el-form>
    </el-card>
  </el-dialog>
</template>

<script>
const emptyConfig = () => ({
  environment: '',
  description: '',
  request_aes_256_cbc_iv: '',
  request_aes_256_cbc_key: '',
  server_rsa_private_key: '',
  response_aes_256_cbc_iv: '',
  response_aes_256_cbc_key: '',
  client_rsa_private_key: '',
})

export default {
  name: 'H5ConfigModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    configs: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue', 'save'],
  data() {
    return {
      editableConfigs: [],
      newConfig: emptyConfig(),
    }
  },
  watch: {
    configs: {
      immediate: true,
      deep: true,
      handler(configs) {
        this.editableConfigs = configs.map((config) => ({ ...emptyConfig(), ...config }))
      },
    },
  },
  methods: {
    addConfig() {
      this.$emit('save', { ...this.newConfig })
      this.newConfig = emptyConfig()
    },
  },
}
</script>
