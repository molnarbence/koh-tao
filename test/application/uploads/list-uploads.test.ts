import { expect, test } from 'bun:test'
import { listUploads } from '../../../server/application/uploads/listUploads'
import { Upload } from '../../../server/domain/uploads/Upload'
import type { IUploadRepository } from '../../../server/application/uploads/ports'
import type { UploadStatus } from '../../../server/domain/uploads/UploadStatus'

class FakeRepo implements IUploadRepository {
  constructor(private uploads: Upload[]) {}
  async save() {}
  async setStatus(_id: string, _status: UploadStatus) {}
  async list() { return this.uploads }
}

test('returns the uploads from the repository', async () => {
  const upload = Upload.rehydrate({
    id: 'u_1', originalFilename: 'a.csv', objectKey: 'uploads/u_1/a.csv',
    status: 'stored', createdAt: new Date('2026-06-14T10:00:00Z')
  })
  const result = await listUploads(new FakeRepo([upload]))
  expect(result).toHaveLength(1)
  expect(result[0]!.id).toBe('u_1')
})
