import type { Upload } from '../../domain/uploads/Upload'
import type { IUploadRepository } from './ports'

export async function listUploads(repo: IUploadRepository): Promise<Upload[]> {
  return repo.list()
}
