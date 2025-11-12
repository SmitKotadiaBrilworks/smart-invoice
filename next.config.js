/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["knozirosktmxixnkexjp.supabase.co"],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
