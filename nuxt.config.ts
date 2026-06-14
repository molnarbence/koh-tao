export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  // pathPrefix defaults to true in Nuxt 4, which would register
  // components/uploads/UploadForm.vue as <UploadsUploadForm>. Disable it so
  // grouped components keep their short names (<UploadForm>, <UploadHistoryTable>).
  components: [{ path: '~/components', pathPrefix: false }],
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
