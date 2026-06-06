/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.idealista.it' },
      { protocol: 'https', hostname: '*.idealista.com' },
      { protocol: 'https', hostname: '*.immobiliare.it' },
      { protocol: 'https', hostname: '*.casa.it' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'cdn-media.medialabtc.it' },
      { protocol: 'https', hostname: '*.medialabtc.it' },
      { protocol: 'https', hostname: '*.tecnocasa.it' },
      { protocol: 'https', hostname: '*.subito.it' },
      { protocol: 'https', hostname: '*.wikicasa.it' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
