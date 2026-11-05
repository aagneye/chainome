import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const worldChainSepolia = defineChain({
  id: 4801,
  name: "World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_WORLDCHAIN_RPC ?? "https://worldchain-sepolia.g.alchemy.com/public"] },
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
    default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://worldchain-mainnet.explorer.alchemy.com" },
  },
});

const isDev = process.env.NODE_ENV === "development";

export const wagmiConfig = getDefaultConfig({
  appName: "GenomeChain",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: isDev ? [worldChainSepolia] : [worldChain, worldChainSepolia],
  ssr: true,
});
