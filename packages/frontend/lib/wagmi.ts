import { createConfig } from "wagmi";
import { defineChain } from "viem";
import { anonTransport } from "./anonRpc";

// RPC endpoints. Every request to them goes through Anon-RPC (see lib/anonRpc.ts),
// so the provider sees a mixnet exit, never the patient's IP.
const SEPOLIA_RPC = process.env.NEXT_PUBLIC_WORLDCHAIN_RPC ?? "https://worldchain-sepolia.g.alchemy.com/public";
const MAINNET_RPC = process.env.NEXT_PUBLIC_WORLDCHAIN_MAINNET_RPC ?? "https://worldchain-mainnet.g.alchemy.com/public";

export const worldChainSepolia = defineChain({
  id: 4801,
  name: "World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [SEPOLIA_RPC] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://worldchain-sepolia.explorer.alchemy.com" },
  },
  testnet: true,
});

export const worldChain = defineChain({
  id: 480,
  name: "World Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [MAINNET_RPC] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://worldchain-mainnet.explorer.alchemy.com" },
  },
});

const isDev = process.env.NODE_ENV === "development";

// ponytail: no connectors — MiniKit owns wallet auth; wagmi is read-only here
export const wagmiConfig = createConfig({
  chains: isDev ? [worldChainSepolia] : [worldChain, worldChainSepolia],
  // No direct-RPC fallback: if Anon-RPC is down, reads fail visibly instead of leaking the IP.
  transports: {
    [worldChainSepolia.id]: anonTransport(SEPOLIA_RPC),
    [worldChain.id]: anonTransport(MAINNET_RPC),
  },
  ssr: true,
});
