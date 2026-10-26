import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  output: process.env.CAPACITOR_BUILD === "true" ? "export" : "standalone",
  turbopack: {},
};

export default withPWA(nextConfig);
