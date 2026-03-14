import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer läuft nur server-seitig — aus dem Client-Bundle ausschließen
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
