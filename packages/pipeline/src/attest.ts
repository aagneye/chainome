/**
 * The pipeline runs on the lab node, so the lab signs LabAttestation over the
 * manifest's Swarm reference. The patient then submits the same string to
 * GenomeRegistry.submitGenome — LabAttestation.isValid compares them exactly.
 */
import { createPublicClient, createWalletClient, defineChain, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "./config";

const worldchainSepolia = defineChain({
  id: 4801,
  name: "World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [env.worldchainRpc] } },
});

const ABI = parseAbi([
  "function attest(uint256 nullifierHash, string genomeCID, uint8 qualityScore) returns (bytes32)",
  "function isValid(uint256 nullifierHash, string genomeCID) view returns (bool)",
]);

export async function attest(nullifierHash: bigint, manifestRef: string, qcPass: boolean): Promise<Hex | undefined> {
  if (!env.labPrivateKey || !env.labAttestation) return undefined;
  const account = privateKeyToAccount(env.labPrivateKey);
  const wallet = createWalletClient({ chain: worldchainSepolia, transport: http(), account });
  const reader = createPublicClient({ chain: worldchainSepolia, transport: http() });

  const hash = await wallet.writeContract({
    address: env.labAttestation,
    abi: ABI,
    functionName: "attest",
    args: [nullifierHash, manifestRef, qcPass ? 95 : 60],
  });
  await reader.waitForTransactionReceipt({ hash });
  const ok = await reader.readContract({ address: env.labAttestation, abi: ABI, functionName: "isValid", args: [nullifierHash, manifestRef] });
  if (!ok) throw new Error("Attestation landed but isValid() returned false");
  return hash;
}
