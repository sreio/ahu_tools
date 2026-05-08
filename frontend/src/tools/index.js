import Base64Tool from './Base64Tool.vue'
import DecryptTool from './DecryptTool.vue'
import HashTool from './HashTool.vue'
import JsonTool from './JsonTool.vue'
import JwtTool from './JwtTool.vue'
import TimestampTool from './TimestampTool.vue'
import UpdateTool from './UpdateTool.vue'
import UrlTool from './UrlTool.vue'

export const tools = [
  {
    key: 'decrypt',
    name: '数据解密',
    group: '现有工具',
    description: 'AES-CBC 解密',
    component: DecryptTool,
  },
  {
    key: 'json',
    name: 'JSON',
    group: '文本处理',
    description: '格式化与压缩',
    component: JsonTool,
  },
  {
    key: 'base64',
    name: 'Base64',
    group: '编码转换',
    description: 'UTF-8 编解码',
    component: Base64Tool,
  },
  {
    key: 'url',
    name: 'URL',
    group: '编码转换',
    description: 'encode/decode',
    component: UrlTool,
  },
  {
    key: 'timestamp',
    name: '时间戳',
    group: '开发辅助',
    description: '时间互转',
    component: TimestampTool,
  },
  {
    key: 'hash',
    name: 'Hash',
    group: '开发辅助',
    description: 'SHA 摘要',
    component: HashTool,
  },
  {
    key: 'jwt',
    name: 'JWT Decode',
    group: '开发辅助',
    description: '仅 decode',
    component: JwtTool,
  },
  {
    key: 'updates',
    name: '应用更新',
    group: '应用',
    description: '检查 GitHub Release',
    component: UpdateTool,
  },
]
