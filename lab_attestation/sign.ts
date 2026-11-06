/**
 * Lab Attestation Signer
 *
 * Signs a genome VCF file producing a tamper-proof attestation.
 * The EIP-191 signature commits to: keccak256(patient | genomeHash | timestamp)
 * Anyone can verify by recovering the signer address from the signature.
 *
 * Usage:
 *   LAB_PRIVATE_KEY=0x... PATIENT=0x... npx ts-node sign.ts <path-to-vcf>
 *
 * Or use the pre-generated attestation.json for the test genome.
 */

import { ethers } from "ethers";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const vcfPath = process.argv[2];
if (!vcfPath) {
  console.error("Usage: ts-node sign.ts <path-to-vcf>");
  process.exit(1);
}

const labPrivateKey = process.env.LAB_PRIVATE_KEY;
if (!labPrivateKey) {
  console.error("LAB_PRIVATE_KEY env var required");
  process.exit(1);
}

const patient = (process.env.PATIENT ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

async function main() {
  const fileBytes = fs.readFileSync(vcfPath);
  const fileSha256 = "0x" + crypto.createHash("sha256").update(fileBytes).digest("hex");
  const fileSize = fileBytes.length;
  const timestamp = Math.floor(Date.now() / 1000);

  // Message committed to: patient address + genome hash + timestamp
  // Using EIP-191 personal_sign so the sig is verifiable on-chain via ECDSA.recover
  const messageHash = ethers.solidityPackedKeccak256(
    ["address", "bytes32", "uint256"],
    [patient, fileSha256, timestamp]
  );

  const wallet = new ethers.Wallet(labPrivateKey);
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  const attestation = {
    version: "1",
    schema: "chainome/lab-attestation/v1",
    file: {
      name: path.basename(vcfPath),
      sha256: fileSha256,
      bytes: fileSize,
      format: "VCF/4.2",
      reference: "GRCh38",
    },
    patient,
    labSigner: wallet.address,
    timestamp,
    isoDttm: new Date(timestamp * 1000).toISOString(),
    messageHash,
    signature,
    verifyCmd: `npx ts-node verify.ts attestation.json`,
  };

  const outPath = path.join(__dirname, "attestation.json");
  fs.writeFileSync(outPath, JSON.stringify(attestation, null, 2));
  console.log("Attestation written →", outPath);
  console.log("Lab signer :", wallet.address);
  console.log("Genome hash:", fileSha256);
  console.log("Signature  :", signature);
}

main().catch(console.error);
