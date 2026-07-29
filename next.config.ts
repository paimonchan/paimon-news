import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 adalah modul native — jangan di-bundle
  serverExternalPackages: ["better-sqlite3"],

  // Remote patterns untuk image dari RSS feed sumber berita
  images: {
    remotePatterns: [
      // Portal berita utama
      { hostname: "**.antaranews.com" },
      { hostname: "**.cnnindonesia.com" },
      { hostname: "**.cnbcindonesia.com" },
      { hostname: "**.tempo.co" },
      { hostname: "**.mediaindonesia.com" },
      { hostname: "**.okezone.com" },
      { hostname: "**.tribunnews.com" },
      { hostname: "**.detik.com" },
      { hostname: "**.sindonews.com" },
      { hostname: "**.rmol.id" },
      { hostname: "**.bbc.com" },
      // CDN / image hosting umum
      { hostname: "**.kompas.com" },
      { hostname: "**.kata.ai" },
      { hostname: "*.googleusercontent.com" },
      { hostname: "*.wp.com" },
    ],
  },
};

export default nextConfig;
