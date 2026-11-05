import { expect } from "chai";
import { ethers } from "hardhat";
import { GenomeRegistry, HealthToken, MockWorldID } from "../typechain-types";

describe("GenomeRegistry", function () {
  let registry: GenomeRegistry;
  let token: HealthToken;
  let mockWorldID: MockWorldID;
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

    const GR = await ethers.getContractFactory("GenomeRegistry");
    registry = await GR.deploy(await mockWorldID.getAddress(), APP_ID, ACTION, await token.getAddress());

    // grant MINTER_ROLE to registry
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.grantRole(MINTER_ROLE, await registry.getAddress());
  });

  it("submits genome and stores CID", async function () {
    await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    expect(await registry.genomeCID(NULL)).to.equal(SAMPLE_CID);
  });

  it("records submission timestamp", async function () {
    const tx = await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    expect(await registry.submittedAt(NULL)).to.equal(block!.timestamp);
  });

  it("increments totalSubmissions", async function () {
    expect(await registry.totalSubmissions()).to.equal(0n);
    await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    expect(await registry.totalSubmissions()).to.equal(1n);
  });

  it("mints 500 GNM to patient on submission", async function () {
    await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    const bal = await token.balanceOf(patient.address);
    expect(bal).to.equal(ethers.parseEther("500"));
  });

  it("reverts on duplicate nullifier", async function () {
    await registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    await expect(
      registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, "QmDifferentCID")
    ).to.be.revertedWithCustomError(registry, "AlreadySubmitted");
  });

  it("reverts on empty CID", async function () {
    await expect(
      registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, "")
    ).to.be.revertedWithCustomError(registry, "InvalidCID");
  });

  it("reverts when World ID proof fails", async function () {
    await mockWorldID.setShouldRevert(true);
    await expect(
      registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID)
    ).to.be.revertedWith("MockWorldID: proof invalid");
  });

  it("emits GenomeSubmitted event", async function () {
    const tx = registry.connect(patient).submitGenome(patient.address, ROOT, NULL, PROOF, SAMPLE_CID);
    await expect(tx).to.emit(registry, "GenomeSubmitted");
  });
});
