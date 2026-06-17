import { prisma } from '../prisma/client'
import { Upload } from '../../domain/uploads/Upload'
import type { UploadStatus } from '../../domain/uploads/UploadStatus'
import type { IUploadRepository } from '../../application/uploads/ports'

export class UploadRepository implements IUploadRepository {
  async save(upload: Upload) {
    await prisma.upload.create({
      data: {
        id: upload.id,
        originalFilename: upload.originalFilename,
        objectKey: upload.objectKey,
        status: upload.status,
        createdAt: upload.createdAt
      }
    })
  }

  async setStatus(id: string, status: UploadStatus) {
    await prisma.upload.update({ where: { id }, data: { status } })
  }

  async list(): Promise<Upload[]> {
    const rows = await prisma.upload.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map((row) =>
      Upload.rehydrate({
        id: row.id,
        originalFilename: row.originalFilename,
        objectKey: row.objectKey,
        status: row.status as UploadStatus,
        createdAt: row.createdAt
      })
    )
  }
}
