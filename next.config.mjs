/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/setup-password',
        destination: '/auth/setup-password',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
