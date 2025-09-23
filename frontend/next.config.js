// /** @type {import('next').NextConfig} */
// const nextConfig = {
//     // Add a custom exportPathMap to set the default route
//     exportPathMap: function () {
//     return {
//         '/': { page: '/login' }, 
//     };
//     },
//     env: {
//         NEXT_API_HOST: '20.246.201.95',
//         NEXT_API_PORT: '80',
//     },
// };
/** @type {import('next').NextConfig} */
module.exports = {
    env: {
        NEXT_API_HOST: 'localhost',
        NEXT_API_PORT: '80',
        NEXT_FB_API: '',
        NEXT_FB_DOMAIN: ''
    },
    async redirects() {
      return [
        {
          source: '/',
          destination: '/login',
          permanent: true,
        },
      ]
    },
  }
