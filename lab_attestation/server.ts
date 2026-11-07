/**
 * Lab Attestation Dashboard Server
 *
 * Usage:
 *   LAB_PRIVATE_KEY=0x... npx ts-node lab_attestation/server.ts
 *
 * Open http://localhost:3333
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3333;
const LAB_PRIVATE_KEY = process.env.LAB_PRIVATE_KEY;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function json(res: http.ServerResponse, status: number, body: object) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(payload);
}

async function handleAttest(req: http.IncomingMessage, res: http.ServerResponse) {
  if (!LAB_PRIVATE_KEY) {
    return json(res, 400, { error: "LAB_PRIVATE_KEY env var not set — restart server with it" });
  }
  const body = JSON.parse(await readBody(req));
  const { vcfContent, patient } = body as { vcfContent: string; patient: string };

  if (!vcfContent) return json(res, 400, { error: "vcfContent required" });
  const patientAddr = (patient || "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const fileBytes = Buffer.from(vcfContent, "utf8");
  const fileSha256 = "0x" + crypto.createHash("sha256").update(fileBytes).digest("hex");
  const timestamp = Math.floor(Date.now() / 1000);

  const messageHash = ethers.solidityPackedKeccak256(
    ["address", "bytes32", "uint256"],
    [patientAddr, fileSha256, timestamp]
  );

  const wallet = new ethers.Wallet(LAB_PRIVATE_KEY);
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  const attestation = {
    version: "1",
    schema: "chainome/lab-attestation/v1",
    file: {
      name: "uploaded.vcf",
      sha256: fileSha256,
      bytes: fileBytes.length,
      format: "VCF/4.2",
      reference: "GRCh38",
    },
    patient: patientAddr,
    labSigner: wallet.address,
    timestamp,
    isoDttm: new Date(timestamp * 1000).toISOString(),
    messageHash,
    signature,
    verifyCmd: `npx ts-node lab_attestation/verify.ts attestation.json genome.vcf`,
  };

  json(res, 200, attestation);
}

async function handleVerify(req: http.IncomingMessage, res: http.ServerResponse) {
  const body = JSON.parse(await readBody(req));
  const { vcfContent, attestation } = body as { vcfContent: string; attestation: Record<string, unknown> };

  if (!vcfContent || !attestation) return json(res, 400, { error: "vcfContent and attestation required" });

  const att = attestation as {
    file: { sha256: string };
    patient: string;
    labSigner: string;
    timestamp: number;
    isoDttm: string;
    signature: string;
  };

  const fileBytes = Buffer.from(vcfContent, "utf8");
  const computed = "0x" + crypto.createHash("sha256").update(fileBytes).digest("hex");
  const hashMatch = computed === att.file.sha256;

  const messageHash = ethers.solidityPackedKeccak256(
    ["address", "bytes32", "uint256"],
    [att.patient, att.file.sha256, att.timestamp]
  );
  const recovered = ethers.verifyMessage(ethers.getBytes(messageHash), att.signature);
  const sigValid = recovered.toLowerCase() === att.labSigner.toLowerCase();

  const ageSeconds = Math.floor(Date.now() / 1000) - att.timestamp;
  const ageDays = Math.floor(ageSeconds / 86400);
  const fresh = ageSeconds < 90 * 86400;

  json(res, 200, {
    fileIntegrity: { pass: hashMatch, expected: att.file.sha256, computed },
    signature: { pass: sigValid, claimed: att.labSigner, recovered },
    freshness: { pass: fresh, ageDays, signedAt: att.isoDttm },
    overall: hashMatch && sigValid ? "VALID" : "INVALID",
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST" });
    return res.end();
  }

  if (req.method === "GET" && (url === "/" || url === "/index.html")) {
    const html = fs.readFileSync(path.join(__dirname, "dashboard.html"));
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(html);
  }

  if (req.method === "POST" && url === "/attest") return handleAttest(req, res);
  if (req.method === "POST" && url === "/verify") return handleVerify(req, res);

  json(res, 404, { error: "not found" });
});

const signerDisplay = LAB_PRIVATE_KEY
  ? new ethers.Wallet(LAB_PRIVATE_KEY).address
  : "NOT SET — restart with LAB_PRIVATE_KEY=0x...";

server.listen(PORT, () => {
  console.log(`\nChainome Lab Attestation Dashboard`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Lab signer: ${signerDisplay}\n`);
});
