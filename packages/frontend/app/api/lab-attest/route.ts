import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const worldChainSepolia = defineChain({
  id: 4801,
  name: "World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://worldchain-sepolia.g.alchemy.com/public"] } },
});

const LAB_ATTEST_ABI = [
  {
    name: "attest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nullifierHash", type: "uint256" },
      { name: "genomeCID", type: "string" },
      { name: "qualityScore", type: "uint8" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    name: "isValid",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "nullifierHash", type: "uint256" },
      { name: "genomeCID", type: "string" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "Attested",
    type: "event",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "lab", type: "address", indexed: true },
      { name: "nullifierHash", type: "uint256", indexed: false },
      { name: "genomeCID", type: "string", indexed: false },
    ],
  },
] as const;

export async function POST(req: NextRequest) {
  try {
    const { nullifierHash, genomeCID } = await req.json();

    if (!nullifierHash || !genomeCID) {
      return NextResponse.json({ error: "nullifierHash and genomeCID required" }, { status: 400 });
    }

    const privateKey = process.env.LAB_PRIVATE_KEY as `0x${string}`;
    const contractAddress = process.env.NEXT_PUBLIC_LAB_ATTESTATION as `0x${string}`;

    // Stub mode: no env vars set (local dev)
    if (!privateKey || !contractAddress) {
      const stubUid = `0x${"ab".repeat(32)}` as `0x${string}`;
      return NextResponse.json({
        uid: stubUid,
        source: "stub",
        message: "Lab attestation stubbed — set LAB_PRIVATE_KEY and NEXT_PUBLIC_LAB_ATTESTATION for real attestation",
      });
    }

    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: worldChainSepolia,
      transport: http(),
    });
    const publicClient = createPublicClient({
      chain: worldChainSepolia,
      transport: http(),
    });

    // Check if already attested
    const alreadyValid = await publicClient.readContract({
      address: contractAddress,
      abi: LAB_ATTEST_ABI,
      functionName: "isValid",
      args: [BigInt(nullifierHash), genomeCID],
    });

    if (alreadyValid) {
      return NextResponse.json({ uid: "already-attested", source: "existing" });
    }

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: LAB_ATTEST_ABI,
      functionName: "attest",
      args: [BigInt(nullifierHash), genomeCID, 95],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      uid: receipt.transactionHash,
      txHash: hash,
      source: "onchain",
    });
  } catch (err) {
    console.error("[lab-attest]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lab attestation failed" },
      { status: 500 }
    );
  }
}
