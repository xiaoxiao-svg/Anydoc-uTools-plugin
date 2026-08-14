export interface MatchFile {
  isFile: boolean
  isDirectory: boolean
  name: string
  path: string
}

export interface PluginEnterAction {
  code: string
  type: string
  payload: MatchFile[] | string
  from: string
}

export type ConvertErrorCode =
  | 'unsupported'
  | 'malformed'
  | 'encrypted'
  | 'resourceLimit'
  | 'missingPart'
  | 'io'
  | 'unknown'

export interface ConvertOk {
  ok: true
  markdown: string
}

export interface ConvertFail {
  ok: false
  code: ConvertErrorCode
  message: string
}

export type ConvertResult = ConvertOk | ConvertFail

export type FileStatus = 'pending' | 'converting' | 'success' | 'error'

export interface FileItem {
  id: string
  name: string
  path: string
  size: number
  status: FileStatus
  result?: ConvertResult
  selected: boolean
}
