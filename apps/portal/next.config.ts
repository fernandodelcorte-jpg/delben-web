import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@delben/firebase', '@delben/core', '@delben/ui', '@react-pdf/renderer'],
}

export default config
