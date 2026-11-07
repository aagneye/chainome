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
  "function revoke(bytes32 uid) external",
  "function getAttestationByNullifier(uint256 nullifierHash) view returns ((bytes32 uid, address attester, uint256 nullifierHash, string genomeCID, uint8 qualityScore, uint64 attestedAt, bool revoked))",
  "function isValid(uint256 nullifierHash, string genomeCID) view returns (bool)",
]);

// AlreadyAttested() selector — revoke existing then re-attest
const ALREADY_ATTESTED = "0x35d90805";

export async function attest(nullifierHash: bigint, manifestRef: string, qcPass: boolean): Promise<Hex | undefined> {
  if (!env.labPrivateKey || !env.labAttestation) return undefined;
  const account = privateKeyToAccount(env.labPrivateKey);
  const wallet = createWalletClient({ chain: worldchainSepolia, transport: http(), account });
  const reader = createPublicClient({ chain: worldchainSepolia, transport: http() });

  async function doAttest(): Promise<Hex> {
    const hash = await wallet.writeContract({
      address: env.labAttestation,
      abi: ABI,
      functionName: "attest",
      args: [nullifierHash, manifestRef, qcPass ? 95 : 60],
    });
    const receipt = await reader.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`Attestation TX reverted: ${hash}`);
    return hash;
  }

  try {
    return await doAttest();
  } catch (err: unknown) {
    // If nullifier was already attested by this lab, revoke and re-attest with new CID.
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes(ALREADY_ATTESTED)) throw err;
    const existing = await reader.readContract({
      address: env.labAttestation,
      abi: ABI,
      functionName: "getAttestationByNullifier",
      args: [nullifierHash],
    });
    const revokeHash = await wallet.writeContract({
      address: env.labAttestation,
      abi: ABI,
      functionName: "revoke",
      args: [existing.uid],
    });
    await reader.waitForTransactionReceipt({ hash: revokeHash });
    return await doAttest();
  }
}
