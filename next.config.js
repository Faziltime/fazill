/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin']
  },
  images: {
    domains: ['ui-avatars.com']
  }
};

module.exports = nextConfig;