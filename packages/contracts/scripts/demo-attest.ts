import { ethers } from "hardhat";

// Usage: npx hardhat run scripts/demo-attest.ts --network worldchainSepolia
// Env vars needed: LAB_ATTESTATION_ADDRESS, NULLIFIER_HASH, GENOME_CID
// Optional:        QUALITY_SCORE (default 95)

async function main() {
  const [deployer] = await ethers.getSigners();

  const labAttestationAddr = process.env.LAB_ATTESTATION_ADDRESS!;
  const nullifierHash = process.env.NULLIFIER_HASH!;
  const genomeCID = process.env.GENOME_CID!;
  const qualityScore = parseInt(process.env.QUALITY_SCORE ?? "95");

  if (!labAttestationAddr || !nullifierHash || !genomeCID) {
    throw new Error("Missing required env vars: LAB_ATTESTATION_ADDRESS, NULLIFIER_HASH, GENOME_CID");
  }

  console.log(`Attesting as: ${deployer.address}`);
  console.log(`LabAttestation: ${labAttestationAddr}`);

  const LabAttestation = await ethers.getContractFactory("LabAttestation");
  const labAttestation = LabAttestation.attach(labAttestationAddr);

  console.log(`Attesting genome for nullifier ${nullifierHash}...`);
  const tx = await labAttestation.attest(nullifierHash, genomeCID, qualityScore);
  const receipt = await tx.wait();

  // Extract UID from Attested event
  const event = receipt?.logs.find((l: any) => l.fragment?.name === "Attested");
  const uid = event?.args?.[0];

  console.log(`Attestation UID: ${uid}`);
  console.log(`Add to .env.local: NEXT_PUBLIC_ATTESTATION_UID=${uid}`);
}

main().catch(console.error);
