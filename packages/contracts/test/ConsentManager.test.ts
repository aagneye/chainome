import { expect } from "chai";
import { ethers } from "hardhat";
import { ConsentManager } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ConsentManager", function () {
  let consent: ConsentManager;
  let patient: ReturnType<typeof ethers.getSigners> extends Promise<infer T> ? T[0] : never;
  let institution: typeof patient;
  let other: typeof patient;

  const DATA_TYPES = ethers.zeroPadBytes("0x01", 32) as `0x${string}`;
  const ONE_YEAR   = 365 * 24 * 60 * 60;

  beforeEach(async function () {
    [, patient, institution, other] = await ethers.getSigners();

    const CM = await ethers.getContractFactory("ConsentManager");
    consent = await CM.deploy();
  });

  async function futureExpiry(seconds = ONE_YEAR) {
    return BigInt((await time.latest()) + seconds);
  }

  it("grants consent and hasConsent returns true", async function () {
    const expiry = await futureExpiry();
    await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    expect(await consent.hasConsent(patient.address, institution.address)).to.be.true;
  });

  it("stores grantedAt timestamp", async function () {
    const expiry = await futureExpiry();
    const tx = await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    const grant = await consent.consents(patient.address, institution.address);
    expect(grant.grantedAt).to.equal(block!.timestamp);
  });

  it("stores dataTypes correctly", async function () {
    const expiry = await futureExpiry();
    await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    const grant = await consent.consents(patient.address, institution.address);
    expect(grant.dataTypes).to.equal(DATA_TYPES);
  });

  it("hasConsent returns false after expiry", async function () {
    const expiry = await futureExpiry(60); // 60 seconds
    await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    await time.increase(61);
    expect(await consent.hasConsent(patient.address, institution.address)).to.be.false;
  });

  it("revokes consent — hasConsent returns false", async function () {
    const expiry = await futureExpiry();
    await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    await consent.connect(patient).revokeConsent(institution.address);
    expect(await consent.hasConsent(patient.address, institution.address)).to.be.false;
  });

  it("revocation sets active=false in storage", async function () {
    const expiry = await futureExpiry();
    await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    await consent.connect(patient).revokeConsent(institution.address);
    const grant = await consent.consents(patient.address, institution.address);
    expect(grant.active).to.be.false;
  });

  it("consent is scoped — other institution has no consent", async function () {
    const expiry = await futureExpiry();
    await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    expect(await consent.hasConsent(patient.address, other.address)).to.be.false;
  });

  it("re-granting after revocation restores consent", async function () {
    const expiry = await futureExpiry();
    await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    await consent.connect(patient).revokeConsent(institution.address);
    const newExpiry = await futureExpiry();
    await consent.connect(patient).grantConsent(institution.address, newExpiry, DATA_TYPES);
    expect(await consent.hasConsent(patient.address, institution.address)).to.be.true;
  });

  it("emits ConsentGranted event", async function () {
    const expiry = await futureExpiry();
    await expect(consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES))
      .to.emit(consent, "ConsentGranted")
      .withArgs(patient.address, institution.address, expiry, DATA_TYPES);
  });

  it("emits ConsentRevoked event", async function () {
    const expiry = await futureExpiry();
    await consent.connect(patient).grantConsent(institution.address, expiry, DATA_TYPES);
    await expect(consent.connect(patient).revokeConsent(institution.address))
      .to.emit(consent, "ConsentRevoked")
      .withArgs(patient.address, institution.address);
  });
});
