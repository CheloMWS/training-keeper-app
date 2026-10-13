import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Apagamos el tipado estricto de rutas que bloquea la navegación local
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;

