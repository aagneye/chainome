/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shared Arkiv schemas + key wrapping are TypeScript source in the workspace.
  transpilePackages: ["@genomechain/shared"],
  webpack: (config) => {
    // wagmi/rainbowkit optional deps that are never used in the browser bundle
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // wagmi's Base Account connector pulls @coinbase/cdp-sdk, whose x402 payment helpers are
    // optional peer deps we don't use. Resolve them to empty modules instead of failing the build.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm/exact/client": false,
    };
    return config;
  },
};

export default nextConfig;
