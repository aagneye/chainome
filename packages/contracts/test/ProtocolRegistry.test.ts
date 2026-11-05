import { expect } from "chai";
import { ethers } from "hardhat";
import { ProtocolRegistry } from "../typechain-types";

describe("ProtocolRegistry", function () {
  let registry: ProtocolRegistry;
  let sponsor: ReturnType<typeof ethers.getSigners> extends Promise<infer T> ? T[0] : never;
  let other: typeof sponsor;

  const PROTOCOL_JSON = JSON.stringify({
    title: "Phase III RCT — Drug X in BRCA2 carriers",
    primaryEndpoint: "Overall survival at 24 months",
    version: "1.0.0",
    date: "2026-11-06"
  });
  const PROTOCOL_HASH = ethers.keccak256(ethers.toUtf8Bytes(PROTOCOL_JSON));

  beforeEach(async function () {
    [, sponsor, other] = await ethers.getSigners();
    const PR = await ethers.getContractFactory("ProtocolRegistry");
    registry = await PR.deploy();
  });

  it("registers a protocol with correct fields", async function () {
    await registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III RCT Drug X");
    const p = await registry.getProtocol(PROTOCOL_HASH);
    expect(p.protocolHash).to.equal(PROTOCOL_HASH);
    expect(p.sponsor).to.equal(sponsor.address);
    expect(p.title).to.equal("Phase III RCT Drug X");
    expect(p.nctNumber).to.equal("");
  });

  it("stores registeredAt timestamp", async function () {
    const tx = await registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III");
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    const p = await registry.getProtocol(PROTOCOL_HASH);
    expect(p.registeredAt).to.equal(block!.timestamp);
  });

  it("reverts on duplicate registration", async function () {
    await registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III");
    await expect(
      registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III")
    ).to.be.revertedWithCustomError(registry, "AlreadyRegistered");
  });

  it("links NCT number after CT.gov registration", async function () {
    await registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III");
    await registry.connect(sponsor).linkNCT(PROTOCOL_HASH, "NCT12345678");
    const p = await registry.getProtocol(PROTOCOL_HASH);
    expect(p.nctNumber).to.equal("NCT12345678");
  });

  it("reverse lookup: nctToHash works", async function () {
    await registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III");
    await registry.connect(sponsor).linkNCT(PROTOCOL_HASH, "NCT12345678");
    expect(await registry.nctToHash("NCT12345678")).to.equal(PROTOCOL_HASH);
  });

  it("reverts linkNCT from non-sponsor", async function () {
    await registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III");
    await expect(
      registry.connect(other).linkNCT(PROTOCOL_HASH, "NCT12345678")
    ).to.be.revertedWithCustomError(registry, "NotSponsor");
  });

  it("reverts double-linking NCT", async function () {
    await registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III");
    await registry.connect(sponsor).linkNCT(PROTOCOL_HASH, "NCT12345678");
    await expect(
      registry.connect(sponsor).linkNCT(PROTOCOL_HASH, "NCT99999999")
    ).to.be.revertedWithCustomError(registry, "NCTAlreadyLinked");
  });

  it("emits ProtocolRegistered event", async function () {
    await expect(registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III"))
      .to.emit(registry, "ProtocolRegistered");
  });

  it("emits NCTLinked event", async function () {
    await registry.connect(sponsor).registerProtocol(PROTOCOL_HASH, "Phase III");
    await expect(registry.connect(sponsor).linkNCT(PROTOCOL_HASH, "NCT12345678"))
      .to.emit(registry, "NCTLinked")
      .withArgs(PROTOCOL_HASH, "NCT12345678");
  });
});
