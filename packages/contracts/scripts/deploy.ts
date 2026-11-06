import { ethers } from "hardhat";

// World ID router addresses
const WORLD_ID_ROUTER: Record<number, string> = {
  480:  "0x17B354dD2595411b53b88B128e5e9a53e97Dc261", // WorldChain mainnet
  4801: "0x469449f251692E0779667583026b5A1E99512157", // WorldChain Sepolia
};

const APP_ID  = process.env.WLD_APP_ID  ?? "app_staging_placeholder";
const ACTION  = process.env.WLD_ACTION  ?? "genome_submission";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const worldIdRouter = WORLD_ID_ROUTER[Number(chainId)];

  if (!worldIdRouter) throw new Error(`No World ID router for chainId ${chainId}`);

  console.log(`Deploying on chain ${chainId} from ${deployer.address}`);
  console.log(`World ID router: ${worldIdRouter}`);

  // 1. HealthToken
  const HealthToken = await ethers.getContractFactory("HealthToken");
  const token = await HealthToken.deploy();
  await token.waitForDeployment();
  console.log(`HealthToken (GNM):   ${await token.getAddress()}`);

  // 2. LabRegistry
  const LabRegistry = await ethers.getContractFactory("LabRegistry");
  const labRegistry = await LabRegistry.deploy();
  await labRegistry.waitForDeployment();
  console.log(`LabRegistry:         ${await labRegistry.getAddress()}`);

  // 3. LabAttestation(labRegistry)
  const LabAttestation = await ethers.getContractFactory("LabAttestation");
  const labAttestation = await LabAttestation.deploy(await labRegistry.getAddress());
  await labAttestation.waitForDeployment();
  console.log(`LabAttestation:      ${await labAttestation.getAddress()}`);

  // 4. GenomeRegistry — now takes labAttestation as 5th arg
  const GenomeRegistry = await ethers.getContractFactory("GenomeRegistry");
  const registry = await GenomeRegistry.deploy(
    worldIdRouter,
    APP_ID,
    ACTION,
    await token.getAddress(),
    await labAttestation.getAddress(),
  );
  await registry.waitForDeployment();
  console.log(`GenomeRegistry:      ${await registry.getAddress()}`);

  // 5. RecordVault
  const RecordVault = await ethers.getContractFactory("RecordVault");
  const vault = await RecordVault.deploy(await token.getAddress());
  await vault.waitForDeployment();
  console.log(`RecordVault:         ${await vault.getAddress()}`);

  // 6. ConsentManager
  const ConsentManager = await ethers.getContractFactory("ConsentManager");
  const consent = await ConsentManager.deploy();
  await consent.waitForDeployment();
  console.log(`ConsentManager:      ${await consent.getAddress()}`);

  // 7. ProtocolRegistry
  const ProtocolRegistry = await ethers.getContractFactory("ProtocolRegistry");
  const protocols = await ProtocolRegistry.deploy();
  await protocols.waitForDeployment();
  console.log(`ProtocolRegistry:    ${await protocols.getAddress()}`);

  // 8. Certify deployer as demo lab
  await labRegistry.certifyLab(deployer.address, "GenomeChain Demo Lab");
  console.log(`Certified ${deployer.address} as "GenomeChain Demo Lab"`);

  // 9-10. Grant MINTER_ROLE to registry + vault
  const MINTER_ROLE = await token.MINTER_ROLE();
  await token.grantRole(MINTER_ROLE, await registry.getAddress());
  await token.grantRole(MINTER_ROLE, await vault.getAddress());
  console.log("MINTER_ROLE granted to registry + vault");

  console.log("\n── Add to .env ──────────────────────────────────────");
  console.log(`NEXT_PUBLIC_HEALTH_TOKEN=${await token.getAddress()}`);
  console.log(`NEXT_PUBLIC_LAB_REGISTRY=${await labRegistry.getAddress()}`);
  console.log(`NEXT_PUBLIC_LAB_ATTESTATION=${await labAttestation.getAddress()}`);
  console.log(`NEXT_PUBLIC_GENOME_REGISTRY=${await registry.getAddress()}`);
  console.log(`NEXT_PUBLIC_RECORD_VAULT=${await vault.getAddress()}`);
  console.log(`NEXT_PUBLIC_CONSENT_MANAGER=${await consent.getAddress()}`);
  console.log(`NEXT_PUBLIC_PROTOCOL_REGISTRY=${await protocols.getAddress()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
