export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  // pathPrefix defaults to true in Nuxt 4, which would register
  // components/uploads/UploadForm.vue as <UploadsUploadForm>. Disable it so
  // grouped components keep their short names (<UploadForm>, <UploadHistoryTable>).
  components: [{ path: '~/components', pathPrefix: false }],
  // Build a Bun-targeted server so the production output runs under Bun, where
  // `import { S3Client } from 'bun'` (in S3Storage) resolves. Dev runs under Bun too,
  // via `bun --bun nuxt dev` (see package.json `dev` and scripts/aspire-dev.ts).
  nitro: { preset: 'bun' },
  runtimeConfig: {
    awsRegion: 'eu-west-1',
    s3Bucket: 'koh-tao-raw',
    s3Prefix: 'uploads',
    s3Endpoint: '',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    public: {
      appName: 'Koh Tao'
    }
  },
  compatibilityDate: '2026-05-17'
})
