/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // libSQL has native parts; keep it out of the server bundle.
  serverExternalPackages: ['@libsql/client', 'libsql'],
};

export default nextConfig;
