import { expect } from "chai";
import { ethers } from "hardhat";

describe("LabAttestation", function () {
  let registry: any;
  let attestation: any;
  let owner: any, lab: any, other: any;

  const NULL_HASH = "42";
  const CID = "QmSampleGenomeCID123";
  const ALT_CID = "QmDifferentCID456";
  const QUALITY = 95;

  beforeEach(async () => {
    [owner, lab, other] = await ethers.getSigners();

    const LR = await ethers.getContractFactory("LabRegistry");
    registry = await LR.deploy();

    const LA = await ethers.getContractFactory("LabAttestation");
    attestation = await LA.deploy(await registry.getAddress());
  });

  // 1. certifyLab stores lab correctly
  it("certifyLab stores lab name", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    expect(await registry.labName(lab.address)).to.equal("Test Lab");
    expect(await registry.certified(lab.address)).to.equal(true);
  });

  // 2. non-owner cannot certifyLab
  it("non-owner cannot certifyLab", async () => {
    await expect(
      registry.connect(other).certifyLab(lab.address, "Bad Lab")
    ).to.be.reverted;
  });

  // 3. attest from certified lab succeeds, returns uid
  it("attest from certified lab succeeds and emits Attested", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    await expect(
      attestation.connect(lab).attest(NULL_HASH, CID, QUALITY)
    ).to.emit(attestation, "Attested");
  });

  // 4. attest stores correct fields
  it("attest stores correct fields", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    const tx = await attestation.connect(lab).attest(NULL_HASH, CID, QUALITY);
    const receipt = await tx.wait();
    const event = receipt?.logs.find((l: any) => l.fragment?.name === "Attested");
    const uid = event?.args?.[0];

    const record = await attestation.getAttestation(uid);
    expect(record.nullifierHash).to.equal(NULL_HASH);
    expect(record.genomeCID).to.equal(CID);
    expect(record.qualityScore).to.equal(QUALITY);
    expect(record.attester).to.equal(lab.address);
    expect(record.revoked).to.equal(false);
  });

  // 5. attest from uncertified address reverts NotCertifiedLab
  it("attest from uncertified address reverts NotCertifiedLab", async () => {
    await expect(
      attestation.connect(other).attest(NULL_HASH, CID, QUALITY)
    ).to.be.revertedWithCustomError(attestation, "NotCertifiedLab");
  });

  // 6. double-attest same nullifierHash reverts AlreadyAttested
  it("double-attest same nullifierHash reverts AlreadyAttested", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    await attestation.connect(lab).attest(NULL_HASH, CID, QUALITY);
    await expect(
      attestation.connect(lab).attest(NULL_HASH, CID, QUALITY)
    ).to.be.revertedWithCustomError(attestation, "AlreadyAttested");
  });

  // 7. isValid returns true for valid unexpired attestation
  it("isValid returns true for a valid unexpired attestation", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    await attestation.connect(lab).attest(NULL_HASH, CID, QUALITY);

    expect(await attestation.isValid(NULL_HASH, CID)).to.equal(true);
  });

  // 8. isValid returns false for wrong CID
  it("isValid returns false for wrong CID", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    await attestation.connect(lab).attest(NULL_HASH, CID, QUALITY);

    expect(await attestation.isValid(NULL_HASH, ALT_CID)).to.equal(false);
  });

  // 9. revoke sets revoked=true, isValid returns false
  it("revoke sets revoked=true and isValid returns false", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    const tx = await attestation.connect(lab).attest(NULL_HASH, CID, QUALITY);
    const receipt = await tx.wait();
    const event = receipt?.logs.find((l: any) => l.fragment?.name === "Attested");
    const uid = event?.args?.[0];

    await attestation.connect(lab).revoke(uid);
    const record = await attestation.getAttestation(uid);
    expect(record.revoked).to.equal(true);
    expect(await attestation.isValid(NULL_HASH, CID)).to.equal(false);
  });

  // 10. revoke from non-attester reverts NotAttester
  it("revoke from non-attester reverts NotAttester", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    const tx = await attestation.connect(lab).attest(NULL_HASH, CID, QUALITY);
    const receipt = await tx.wait();
    const event = receipt?.logs.find((l: any) => l.fragment?.name === "Attested");
    const uid = event?.args?.[0];

    await expect(
      attestation.connect(other).revoke(uid)
    ).to.be.revertedWithCustomError(attestation, "NotAttester");
  });

  // 11. getAttestationByNullifier works
  it("getAttestationByNullifier returns correct record", async () => {
    await registry.connect(owner).certifyLab(lab.address, "Test Lab");
    await attestation.connect(lab).attest(NULL_HASH, CID, QUALITY);

    const record = await attestation.getAttestationByNullifier(NULL_HASH);
    expect(record.genomeCID).to.equal(CID);
    expect(record.attester).to.equal(lab.address);
  });
});
