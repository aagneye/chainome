import { expect } from "chai";
import { ethers } from "hardhat";
import { RecordVault, HealthToken } from "../typechain-types";

describe("RecordVault", function () {
  let vault: RecordVault;
  let token: HealthToken;
  let patient: ReturnType<typeof ethers.getSigners> extends Promise<infer T> ? T[0] : never;
  let other: typeof patient;

  beforeEach(async function () {
    [, patient, other] = await ethers.getSigners();

    const HT = await ethers.getContractFactory("HealthToken");
    token = await HT.deploy();

    const RV = await ethers.getContractFactory("RecordVault");
    vault = await RV.deploy(await token.getAddress());

    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.grantRole(MINTER_ROLE, await vault.getAddress());
  });

  it("stores a record for the caller", async function () {
    await vault.connect(patient).addRecord("QmCID1", "Lab Report");
    const records = await vault.getRecords(patient.address);
    expect(records.length).to.equal(1);
    expect(records[0].cid).to.equal("QmCID1");
    expect(records[0].recordType).to.equal("Lab Report");
  });

  it("getRecordCount returns correct count", async function () {
    expect(await vault.getRecordCount(patient.address)).to.equal(0n);
    await vault.connect(patient).addRecord("QmCID1", "Lab Report");
    expect(await vault.getRecordCount(patient.address)).to.equal(1n);
    await vault.connect(patient).addRecord("QmCID2", "Prescription");
    expect(await vault.getRecordCount(patient.address)).to.equal(2n);
  });

  it("mints 10 GNM per record", async function () {
    await vault.connect(patient).addRecord("QmCID1", "Lab Report");
    expect(await token.balanceOf(patient.address)).to.equal(ethers.parseEther("10"));
    await vault.connect(patient).addRecord("QmCID2", "Prescription");
    expect(await token.balanceOf(patient.address)).to.equal(ethers.parseEther("20"));
  });

  it("records are isolated per wallet", async function () {
    await vault.connect(patient).addRecord("QmCID1", "Lab Report");
    await vault.connect(other).addRecord("QmCID2", "Imaging");

    expect(await vault.getRecordCount(patient.address)).to.equal(1n);
    expect(await vault.getRecordCount(other.address)).to.equal(1n);
    expect((await vault.getRecords(patient.address))[0].cid).to.equal("QmCID1");
    expect((await vault.getRecords(other.address))[0].cid).to.equal("QmCID2");
  });

  it("stores uploadedAt timestamp", async function () {
    const tx = await vault.connect(patient).addRecord("QmCID1", "Lab Report");
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    const records = await vault.getRecords(patient.address);
    expect(records[0].uploadedAt).to.equal(block!.timestamp);
  });

  it("emits RecordAdded event", async function () {
    await expect(vault.connect(patient).addRecord("QmCID1", "Lab Report"))
      .to.emit(vault, "RecordAdded")
      .withArgs(patient.address, "QmCID1", "Lab Report", await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
  });
});
