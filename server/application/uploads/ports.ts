import type { Upload } from '../../domain/uploads/Upload'
import type { UploadStatus } from '../../domain/uploads/UploadStatus'

export interface IUploadStorage {
  putObject(input: { key: string; body: ArrayBuffer; contentType?: string }): Promise<void>
}

export interface IUploadRepository {
  save(upload: Upload): Promise<void>
  setStatus(id: string, status: UploadStatus): Promise<void>
  list(): Promise<Upload[]>
}
