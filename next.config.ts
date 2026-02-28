import type { NextConfig } from "next";

// PWA deshabilitado en desarrollo para evitar conflictos con turbopack
// En producción se activa via ANALYZE o build
const isDev = process.env.NODE_ENV === "development";

let nextConfig: NextConfig = {
  // Silencia warning de múltiples lockfiles
  turbopack: {},
};

// Solo aplica withPWA en producción
if (!isDev) {
  const withPWAInit = require("@ducanh2912/next-pwa").default;
  const withPWA = withPWAInit({
    dest: "public",
    cacheOnFrontEndNav: true,
    reloadOnOnline: true,
  });
  nextConfig = withPWA(nextConfig);
}

export default nextConfig;
