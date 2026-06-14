import { Upload } from '../../domain/uploads/Upload'
import type { IUploadStorage, IUploadRepository } from './ports'

type CreateUploadInput = {
  id: string
  originalFilename: string
  file: ArrayBuffer
  contentType?: string
  prefix: string
}

export async function createUpload(
  input: CreateUploadInput,
  storage: IUploadStorage,
  repo: IUploadRepository
): Promise<Upload> {
  const objectKey = `${input.prefix}/${input.id}/${input.originalFilename}`
  const upload = Upload.create({ id: input.id, originalFilename: input.originalFilename, objectKey })

  await repo.save(upload)

  try {
    await storage.putObject({ key: objectKey, body: input.file, contentType: input.contentType })
  } catch (error) {
    upload.markFailed()
    await repo.setStatus(upload.id, 'failed')
    throw error
  }

  upload.markStored()
  await repo.setStatus(upload.id, 'stored')
  return upload
}
