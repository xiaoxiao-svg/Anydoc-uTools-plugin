import type { ConvertErrorCode } from '../types'

export const ERROR_MESSAGES: Record<ConvertErrorCode, string> = {
  unsupported: '不支持的格式，或纯图片型 PDF（无文字层，需 OCR）',
  malformed: '文件结构损坏，无法提取有效内容',
  encrypted: '文件已加密或受密码保护，请先解密',
  resourceLimit: '超出安全限制（压缩层数/嵌套/节点数），文件可能异常',
  missingPart: '文件缺少必要部件，无法转换',
  io: '文件读取失败',
  unknown: '未知错误',
}

export function errorText(code: ConvertErrorCode, fallback: string): string {
  return `${ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown}${fallback && code === 'unknown' ? `：${fallback}` : ''}`
}
