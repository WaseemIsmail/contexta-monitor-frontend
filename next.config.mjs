import os from "node:os";

const localNetworkAddresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((network) => network && !network.internal && (network.family === "IPv4" || network.family === 4))
  .map((network) => network.address);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow this computer's current Wi-Fi/LAN address to load dev-only assets.
  // Next.js still blocks every unrelated host, and production is unaffected.
  allowedDevOrigins: localNetworkAddresses,
};

export default nextConfig;
