import { z } from 'zod'
import { createUpload } from '../../application/uploads/createUpload'
import { StorageError } from '../../application/uploads/errors'
import { S3Storage } from '../../infrastructure/storage/S3Storage'
import { UploadRepository } from '../../infrastructure/repositories/UploadRepository'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const metadataSchema = z.object({
  filename: z.string().trim().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES)
})

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const filePart = parts?.find((part) => part.name === 'file' && part.filename)

  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const metadata = metadataSchema.safeParse({
    filename: filePart.filename,
    size: filePart.data.length
  })
  if (!metadata.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid upload' })
  }

  const config = useRuntimeConfig()
  const storage = new S3Storage({
    endpoint: config.s3Endpoint,
    region: config.awsRegion,
    bucket: config.s3Bucket,
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  })
  const repo = new UploadRepository()

  const body = filePart.data.buffer.slice(
    filePart.data.byteOffset,
    filePart.data.byteOffset + filePart.data.byteLength
  )

  try {
    const upload = await createUpload(
      {
        id: Bun.randomUUIDv7(),
        originalFilename: metadata.data.filename,
        file: body,
        contentType: filePart.type,
        prefix: config.s3Prefix
      },
      storage,
      repo
    )
    return { id: upload.id, originalFilename: upload.originalFilename, status: upload.status }
  } catch (error) {
    if (error instanceof StorageError) {
      throw createError({ statusCode: 502, statusMessage: 'Upload to storage failed' })
    }
    throw error
  }
})
