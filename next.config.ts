import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ВАЖНО: Создает минимальный билд для Docker.
  // Без этого Next.js тянет все node_modules в память.
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.fashn.ai',
      },
      {
        protocol: 'https',
        hostname: 'storage.yandexcloud.net',
      },
      {
        protocol: 'https',
        hostname: 'modelka-storage.storage.yandexcloud.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;