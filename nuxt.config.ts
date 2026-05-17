export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    auth0Domain: '',
    auth0Audience: '',
    auth0ClientId: '',
    auth0ClientSecret: '',
    awsRegion: '',
    s3Bucket: '',
    public: {
      appName: 'Koh Tao'
    }
  },
  compatibilityDate: '2026-05-17'
})
