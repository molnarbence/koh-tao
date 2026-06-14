import { listUploads } from '../../application/uploads/listUploads'
import { UploadRepository } from '../../infrastructure/repositories/UploadRepository'

export default defineEventHandler(async () => {
  const repo = new UploadRepository()
  const uploads = await listUploads(repo)
  return uploads.map((upload) => ({
    id: upload.id,
    originalFilename: upload.originalFilename,
    status: upload.status,
    createdAt: upload.createdAt
  }))
})
