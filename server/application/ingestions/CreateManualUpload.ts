import { S3Storage } from '../../infrastructure/storage/S3Storage'

export async function createManualUpload(input: {
  ingestionId: string
  filename: string
  file: ArrayBuffer
}) {
  const storage = new S3Storage()
  return storage.putObject({
    key: `manual-uploads/${input.ingestionId}/${input.filename}`,
    body: input.file
  })
}
