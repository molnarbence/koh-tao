import { S3Client } from 'bun'
import type { IUploadStorage } from '../../application/uploads/ports'

export type S3StorageConfig = {
  endpoint?: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export class S3Storage implements IUploadStorage {
  private readonly client: S3Client

  constructor(config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      bucket: config.bucket,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
      // virtualHostedStyle left default (false) → path-style, required by MinIO/LocalStack
    })
  }

  async putObject(input: { key: string; body: ArrayBuffer; contentType?: string }) {
    await this.client.write(input.key, new Uint8Array(input.body), { type: input.contentType })
  }
}
