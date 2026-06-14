export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
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
