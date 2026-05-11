import Base64Tool from './Base64Tool.vue'
import DecryptTool from './DecryptTool.vue'
import HashTool from './HashTool.vue'
import HtmlEntityTool from './HtmlEntityTool.vue'
import JsonTool from './JsonTool.vue'
import JwtTool from './JwtTool.vue'
import QueryTool from './QueryTool.vue'
import RandomTool from './RandomTool.vue'
import RegexTool from './RegexTool.vue'
import TimestampTool from './TimestampTool.vue'
import UrlTool from './UrlTool.vue'

export const tools = [
  {
    key: 'decrypt',
    name: '数据解密',
    group: '现有工具',
    description: 'AES-CBC 解密',
    shortName: '解',
    component: DecryptTool,
  },
  {
    key: 'json',
    name: 'JSON',
    group: '文本处理',
    description: '格式化与压缩',
    shortName: 'JSON',
    component: JsonTool,
  },
  {
    key: 'base64',
    name: 'Base64',
    group: '编码转换',
    description: 'UTF-8 编解码',
    shortName: 'B64',
    component: Base64Tool,
  },
  {
    key: 'url',
    name: 'URL',
    group: '编码转换',
    description: 'encode/decode',
    shortName: 'URL',
    component: UrlTool,
  },
  {
    key: 'query',
    name: 'URL 参数',
    group: '编码转换',
    description: '解析与构建 query',
    shortName: 'Query',
    component: QueryTool,
  },
  {
    key: 'html-entity',
    name: 'HTML 实体',
    group: '编码转换',
    description: '实体编码与解码',
    shortName: 'HTML',
    component: HtmlEntityTool,
  },
  {
    key: 'timestamp',
    name: '时间戳',
    group: '开发辅助',
    description: '时间互转',
    shortName: '时',
    component: TimestampTool,
  },
  {
    key: 'hash',
    name: 'Hash',
    group: '开发辅助',
    description: 'SHA 摘要',
    shortName: '#',
    component: HashTool,
  },
  {
    key: 'jwt',
    name: 'JWT Decode',
    group: '开发辅助',
    description: '仅 decode',
    shortName: 'JWT',
    component: JwtTool,
  },
  {
    key: 'random',
    name: 'UUID / 随机',
    group: '开发辅助',
    description: 'UUID 与随机字符串',
    shortName: 'UUID',
    component: RandomTool,
  },
  {
    key: 'regex',
    name: '正则测试',
    group: '文本处理',
    description: 'JS 正则匹配',
    shortName: 'Re',
    component: RegexTool,
  },
]
