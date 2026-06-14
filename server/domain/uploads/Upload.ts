import { UploadStatus, assertTransition } from './UploadStatus'

type CreateUploadInput = {
  id: string
  originalFilename: string
  objectKey: string
}

type RehydrateUploadInput = {
  id: string
  originalFilename: string
  objectKey: string
  status: UploadStatus
  createdAt: Date
}

export class Upload {
  private constructor(
    readonly id: string,
    readonly originalFilename: string,
    readonly objectKey: string,
    public status: UploadStatus,
    readonly createdAt: Date
  ) {}

  static create(input: CreateUploadInput) {
    if (input.originalFilename.trim().length === 0) {
      throw new Error('originalFilename must not be empty')
    }
    return new Upload(input.id, input.originalFilename, input.objectKey, 'pending', new Date())
  }

  static rehydrate(input: RehydrateUploadInput) {
    return new Upload(input.id, input.originalFilename, input.objectKey, input.status, input.createdAt)
  }

  markStored() {
    assertTransition(this.status, 'stored')
    this.status = 'stored'
  }

  markFailed() {
    assertTransition(this.status, 'failed')
    this.status = 'failed'
  }
}
