/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/index",
        destination: "/airfare-index",
      },
    ];
  },
};

export default nextConfig;
