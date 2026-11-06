import { expect } from "chai";
import { ethers } from "hardhat";
import { GenomeRegistry, HealthToken, MockWorldID } from "../typechain-types";

describe("GenomeRegistry", function () {
  let registry: GenomeRegistry;
  let token: HealthToken;
  let mockWorldID: MockWorldID;
  let labAttestation: any;
  let owner: ReturnType<typeof ethers.getSigners> extends Promise<infer T> ? T[0] : never;
  let patient: typeof owner;

  const APP_ID = "app_staging_test";
  const ACTION  = "genome_submission";
  const SAMPLE_CID = "QmSampleCID123456789";

  // Proof values — mock verifier ignores these
  const ROOT    = 1n;
  const NULL    = 42n;
  const PROOF   = Array(8).fill(0n) as [bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint];

  beforeEach(async function () {
    [owner, patient] = await ethers.getSigners();

    const MockWID = await ethers.getContractFactory("MockWorldID");
    mockWorldID = await MockWID.deploy();

    const HT = await ethers.getContractFactory("HealthToken");
    token = await HT.deploy();

    // Deploy LabRegistry + LabAttestation; certify owner as the demo lab
    const LR = await ethers.getContractFactory("LabRegistry");
    const labRegistry = await LR.deploy();

    const LA = await ethers.getContractFactory("LabAttestation");
    labAttestation = await LA.deploy(await labRegistry.getAddress());

    await labRegistry.connect(owner).certifyLab(owner.address, "Test Lab");

    const GR = await ethers.getContractFactory("GenomeRegistry");
    registry = await GR.deploy(
      await mockWorldID.getAddress(),
      APP_ID,
      ACTION,
      await token.getAddress(),
      await labAttestation.getAddress()
    );

    // grant MINTER_ROLE to registry
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.grantRole(MINTER_ROLE, await registry.getAddress());
  });

  it("submits genome and stores CID", async function () {
    await labAttestation.connect(owner).attest(NULL, SAMPLE_CID, 95);
    await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    expect(await registry.genomeCID(NULL)).to.equal(SAMPLE_CID);
  });

  it("records submission timestamp", async function () {
    await labAttestation.connect(owner).attest(NULL, SAMPLE_CID, 95);
    const tx = await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    expect(await registry.submittedAt(NULL)).to.equal(block!.timestamp);
  });

  it("increments totalSubmissions", async function () {
    expect(await registry.totalSubmissions()).to.equal(0n);
    await labAttestation.connect(owner).attest(NULL, SAMPLE_CID, 95);
    await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    expect(await registry.totalSubmissions()).to.equal(1n);
  });

  it("mints 500 GNM to patient on submission", async function () {
    await labAttestation.connect(owner).attest(NULL, SAMPLE_CID, 95);
    await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    const bal = await token.balanceOf(patient.address);
    expect(bal).to.equal(ethers.parseEther("500"));
  });

  it("reverts on duplicate nullifier", async function () {
    await labAttestation.connect(owner).attest(NULL, SAMPLE_CID, 95);
    await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    // AlreadySubmitted is checked before NotLabAttested — no second attest needed
    await expect(
      registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, "QmDifferentCID")
    ).to.be.revertedWithCustomError(registry, "AlreadySubmitted");
  });

  it("reverts on empty CID", async function () {
    // InvalidCID is checked before lab attestation — no attest needed
    await expect(
      registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, "")
    ).to.be.revertedWithCustomError(registry, "InvalidCID");
  });

  it("reverts when World ID proof fails", async function () {
    // proof check happens before lab attestation check — no attest needed
    await mockWorldID.setShouldRevert(true);
    await expect(
      registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID)
    ).to.be.revertedWith("MockWorldID: proof invalid");
  });

  it("emits GenomeSubmitted event", async function () {
    await labAttestation.connect(owner).attest(NULL, SAMPLE_CID, 95);
    const tx = registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    await expect(tx).to.emit(registry, "GenomeSubmitted");
  });

  it("reverts NotLabAttested when no attestation exists", async function () {
    await expect(
      registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID)
    ).to.be.revertedWithCustomError(registry, "NotLabAttested");
  });
});
