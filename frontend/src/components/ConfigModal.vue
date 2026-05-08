<template>
  <el-dialog
    :model-value="modelValue"
    title="环境配置"
    width="760px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="config-list">
      <el-card v-for="config in editableConfigs" :key="config.environment" class="config-card" shadow="never">
        <template #header>
          <div class="config-card-header">
            <span>{{ config.description || config.environment }}</span>
            <el-tag>{{ config.environment }}</el-tag>
          </div>
        </template>

        <el-form label-position="top">
          <el-form-item label="密钥（16字节）">
            <el-input v-model="config.key" maxlength="16" show-word-limit placeholder="请输入16字节密钥" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="config.description" placeholder="请输入环境描述" />
          </el-form-item>
          <el-button type="primary" @click="$emit('save', config)">保存配置</el-button>
        </el-form>
      </el-card>
    </div>

    <el-card class="config-card" shadow="never">
      <template #header>添加新环境</template>
      <el-form label-position="top">
        <el-form-item label="环境标识">
          <el-input v-model="newConfig.environment" placeholder="例如: staging" />
        </el-form-item>
        <el-form-item label="密钥（16字节）">
          <el-input v-model="newConfig.key" maxlength="16" show-word-limit placeholder="请输入16字节密钥" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newConfig.description" placeholder="例如: 预发布环境" />
        </el-form-item>
        <el-button type="success" @click="addConfig">添加环境</el-button>
      </el-form>
    </el-card>
  </el-dialog>
</template>

<script>
export default {
  name: 'ConfigModal',
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
      newConfig: {
        environment: '',
        key: '',
        description: '',
      },
    }
  },
  watch: {
    configs: {
      immediate: true,
      deep: true,
      handler(configs) {
        this.editableConfigs = configs.map((config) => ({ ...config }))
      },
    },
  },
  methods: {
    addConfig() {
      this.$emit('save', { ...this.newConfig })
      this.newConfig = {
        environment: '',
        key: '',
        description: '',
      }
    },
  },
}
</script>
