import { afterAll, beforeAll, expect, test } from 'bun:test'
import { $, S3Client } from 'bun'
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers'
import { MinioContainer, type StartedMinioContainer } from '@testcontainers/minio'

let postgres: StartedTestContainer
let minio: StartedMinioContainer
let s3Endpoint = ''
const bucket = 'koh-tao-raw'
const prefix = 'uploads'
const accessKeyId = 'minioadmin'
const secretAccessKey = 'minioadmin'

beforeAll(async () => {
  postgres = await new GenericContainer('postgres:18')
    .withEnvironment({ POSTGRES_PASSWORD: 'test', POSTGRES_USER: 'test', POSTGRES_DB: 'test' })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 1))
    .start()

  minio = await new MinioContainer('minio/minio:latest')
    .withUsername(accessKeyId)
    .withPassword(secretAccessKey)
    .start()

  s3Endpoint = minio.getConnectionUrl()

  // MinIO enforces signed auth, so create the bucket with the bundled mc client rather
  // than an unsigned PUT. We shell out via `docker exec` instead of the container's
  // exec() helper, which hangs under Bun. (localhost:9000 in the container is MinIO.)
  const containerId = minio.getId()
  await $`docker exec ${containerId} mc alias set local http://localhost:9000 ${accessKeyId} ${secretAccessKey}`.quiet()
  await $`docker exec ${containerId} mc mb --ignore-existing local/${bucket}`.quiet()

  const dbUrl = `postgresql://test:test@${postgres.getHost()}:${postgres.getMappedPort(5432)}/test`
  process.env.DATABASE_URL = dbUrl
  await $`bunx prisma db push`.env({ ...process.env, DATABASE_URL: dbUrl })
}, 180000)

afterAll(async () => {
  await postgres?.stop()
  await minio?.stop()
})

test('upload stores the object and records a stored history row', async () => {
  const { S3Storage } = await import('../../../server/infrastructure/storage/S3Storage')
  const { UploadRepository } = await import('../../../server/infrastructure/repositories/UploadRepository')
  const { createUpload } = await import('../../../server/application/uploads/createUpload')
  const { listUploads } = await import('../../../server/application/uploads/listUploads')

  const storage = new S3Storage({
    endpoint: s3Endpoint,
    region: 'us-east-1',
    bucket,
    accessKeyId,
    secretAccessKey
  })
  const repo = new UploadRepository()

  const upload = await createUpload(
    { id: Bun.randomUUIDv7(), originalFilename: 'usage.csv', file: new TextEncoder().encode('a,b,c').buffer, prefix },
    storage,
    repo
  )

  expect(upload.status).toBe('stored')

  // object physically exists in the bucket (read it back via Bun's S3 client)
  const client = new S3Client({
    endpoint: s3Endpoint,
    region: 'us-east-1',
    bucket,
    accessKeyId,
    secretAccessKey
  })
  expect(await client.file(upload.objectKey).text()).toBe('a,b,c')

  // history reflects the stored row
  const history = await listUploads(repo)
  expect(history.some((entry) => entry.id === upload.id && entry.status === 'stored')).toBe(true)
}, 60000)
