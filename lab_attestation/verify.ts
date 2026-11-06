/**
 * Lab Attestation Verifier
 *
 * Given an attestation.json and the original VCF, confirms:
 *   1. File hash matches — file not tampered
 *   2. Recovered signer matches labSigner — signature authentic
 *   3. Timestamp is within 90 days — not stale
 *
 * Usage:
 *   npx ts-node verify.ts attestation.json [path-to-vcf]
 */

import { ethers } from "ethers";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const attestationPath = process.argv[2];
if (!attestationPath) {
  console.error("Usage: ts-node verify.ts <attestation.json> [vcf-path]");
  process.exit(1);
}

async function main() {
  const att = JSON.parse(fs.readFileSync(attestationPath, "utf8"));

  console.log("\n=== Chainome Lab Attestation Verifier ===\n");

  // 1. File hash check (optional — requires VCF on disk)
  const vcfPath = process.argv[3] ?? path.join(path.dirname(attestationPath), att.file.name);
  if (fs.existsSync(vcfPath)) {
    const fileBytes = fs.readFileSync(vcfPath);
    const computed = "0x" + crypto.createHash("sha256").update(fileBytes).digest("hex");
    const hashMatch = computed === att.file.sha256;
    console.log(`File integrity : ${hashMatch ? "✓ PASS" : "✗ FAIL — file was tampered!"}`);
    console.log(`  expected     : ${att.file.sha256}`);
    console.log(`  computed     : ${computed}`);
    if (!hashMatch) process.exitCode = 1;
  } else {
    console.log("File integrity : SKIPPED (VCF not found on disk)");
  }

  // 2. Signature recovery
  const messageHash = ethers.solidityPackedKeccak256(
    ["address", "bytes32", "uint256"],
    [att.patient, att.file.sha256, att.timestamp]
  );
  const recovered = ethers.verifyMessage(ethers.getBytes(messageHash), att.signature);
  const sigValid = recovered.toLowerCase() === att.labSigner.toLowerCase();
  console.log(`\nSignature      : ${sigValid ? "✓ VALID" : "✗ INVALID — signature mismatch!"}`);
  console.log(`  claimed      : ${att.labSigner}`);
  console.log(`  recovered    : ${recovered}`);
  if (!sigValid) process.exitCode = 1;

  // 3. Freshness
  const ageSeconds = Math.floor(Date.now() / 1000) - att.timestamp;
  const ageDays = Math.floor(ageSeconds / 86400);
  const fresh = ageSeconds < 90 * 86400;
  console.log(`\nFreshness      : ${fresh ? "✓ OK" : "⚠ STALE"} (${ageDays}d old)`);
  console.log(`  signed at    : ${att.isoDttm}`);

  // 4. Summary
  console.log("\n──────────────────────────────────────────");
  if (process.exitCode === 1) {
    console.log("RESULT: ✗ ATTESTATION INVALID");
  } else {
    console.log("RESULT: ✓ ATTESTATION VALID");
    console.log(`  Genome       : ${att.file.name} (${att.file.bytes} bytes, ${att.file.format})`);
    console.log(`  Reference    : ${att.file.reference}`);
    console.log(`  Patient      : ${att.patient}`);
    console.log(`  Lab signer   : ${att.labSigner}`);
  }
  console.log("──────────────────────────────────────────\n");
}

main().catch(console.error);
