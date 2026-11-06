import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain, http, fallback } from "viem";

// WorldChain Sepolia Anon RPC — strips IP from tx broadcast (privacy for medical data)
const ANON_RPC = "https://anon-rpc.worldchain-sepolia.g.alchemy.com/public";
// Fall back to public RPC if anon not available
const PUBLIC_RPC = process.env.NEXT_PUBLIC_WORLDCHAIN_RPC ?? "https://worldchain-sepolia.g.alchemy.com/public";

export const worldChainSepolia = defineChain({
  id: 4801,
  name: "World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [ANON_RPC] },
    public:  { http: [PUBLIC_RPC] },
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
  transports: {
    [worldChainSepolia.id]: fallback([http(ANON_RPC), http(PUBLIC_RPC)]),
    [worldChain.id]: http("https://worldchain-mainnet.g.alchemy.com/public"),
  },
  ssr: true,
});
