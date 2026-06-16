import { expect, test } from 'bun:test'
import { createUpload } from '../../../server/application/uploads/createUpload'
import { StorageError } from '../../../server/application/uploads/errors'
import { Upload } from '../../../server/domain/uploads/Upload'
import type { IUploadStorage, IUploadRepository } from '../../../server/application/uploads/ports'
import type { UploadStatus } from '../../../server/domain/uploads/UploadStatus'

class FakeRepo implements IUploadRepository {
  saved: Upload[] = []
  // Upload is mutable; capture the status at save-time so assertions see what was
  // persisted then, not the later-mutated value of the shared reference.
  savedStatusAtSave: UploadStatus[] = []
  statusUpdates: Array<{ id: string; status: UploadStatus }> = []
  async save(upload: Upload) {
    this.saved.push(upload)
    this.savedStatusAtSave.push(upload.status)
  }
  async setStatus(id: string, status: UploadStatus) { this.statusUpdates.push({ id, status }) }
  async list() { return this.saved }
}

class FakeStorage implements IUploadStorage {
  puts: Array<{ key: string }> = []
  shouldThrow = false
  async putObject(input: { key: string; body: ArrayBuffer }) {
    if (this.shouldThrow) throw new Error('s3 down')
    this.puts.push({ key: input.key })
  }
}

test('persists pending first, stores object, then marks stored', async () => {
  const repo = new FakeRepo()
  const storage = new FakeStorage()

  const upload = await createUpload(
    { id: 'u_1', originalFilename: 'data.csv', file: new ArrayBuffer(4), prefix: 'uploads' },
    storage,
    repo
  )

  expect(repo.savedStatusAtSave[0]).toBe('pending')
  expect(storage.puts[0]!.key).toBe('uploads/u_1/data.csv')
  expect(repo.statusUpdates).toEqual([{ id: 'u_1', status: 'stored' }])
  expect(upload.status).toBe('stored')
})

test('marks failed and rethrows when storage throws', async () => {
  const repo = new FakeRepo()
  const storage = new FakeStorage()
  storage.shouldThrow = true

  const error = await createUpload(
    { id: 'u_2', originalFilename: 'data.csv', file: new ArrayBuffer(4), prefix: 'uploads' },
    storage,
    repo
  ).catch((e) => e)

  expect(error).toBeInstanceOf(StorageError)
  expect((error as StorageError).cause).toBeInstanceOf(Error)
  expect(repo.savedStatusAtSave[0]).toBe('pending')
  expect(repo.statusUpdates).toEqual([{ id: 'u_2', status: 'failed' }])
})
