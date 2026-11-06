import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("StudyRegistry", function () {
  let token: any;
  let registry: any;
  let owner: any, sponsor: any, patient: any, patient2: any;

  const TITLE = "Genome Aging Study";
  const DESC = "Study on aging markers";
  const DATA_TYPES = ethers.zeroPadBytes("0x01", 32);
  const REWARD = ethers.parseEther("10");
  const MAX_PARTICIPANTS = 2;
  const IRB = "QmIRBHash123";

  async function deployFixture() {
    [owner, sponsor, patient, patient2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("HealthToken");
    token = await Token.deploy();

    const Registry = await ethers.getContractFactory("StudyRegistry");
    registry = await Registry.deploy(await token.getAddress());
  }

  async function publishStudy(deadlineOffset = 3600) {
    const deadline = (await time.latest()) + deadlineOffset;
    const tx = await registry.connect(sponsor).publishStudy(
      TITLE,
      DESC,
      DATA_TYPES,
      true,
      REWARD,
      MAX_PARTICIPANTS,
      deadline,
      IRB
    );
    await tx.wait();
    return deadline;
  }

  beforeEach(deployFixture);

  // 1. publishStudy stores correct fields
  it("publishStudy stores correct fields", async () => {
    const deadline = await publishStudy();
    const study = await registry.getStudy(1);
    expect(study.sponsor).to.equal(sponsor.address);
    expect(study.title).to.equal(TITLE);
    expect(study.rewardPerParticipant).to.equal(REWARD);
    expect(study.status).to.equal(0); // Active
    expect(study.requiresGenome).to.equal(true);
    expect(study.deadline).to.equal(deadline);
  });

  // 2. publishStudy increments studyCount
  it("publishStudy increments studyCount", async () => {
    expect(await registry.studyCount()).to.equal(0);
    await publishStudy();
    expect(await registry.studyCount()).to.equal(1);
    await publishStudy();
    expect(await registry.studyCount()).to.equal(2);
  });

  // 3. publishStudy emits StudyPublished event
  it("publishStudy emits StudyPublished event", async () => {
    const deadline = (await time.latest()) + 3600;
    await expect(
      registry.connect(sponsor).publishStudy(TITLE, DESC, DATA_TYPES, true, REWARD, MAX_PARTICIPANTS, deadline, IRB)
    )
      .to.emit(registry, "StudyPublished")
      .withArgs(1, sponsor.address, TITLE, REWARD);
  });

  // 4. joinStudy stores participation with correct sharedDataTypes
  it("joinStudy stores participation with correct sharedDataTypes", async () => {
    await publishStudy();
    await registry.connect(patient).joinStudy(1, DATA_TYPES);
    const p = await registry.participations(1, patient.address);
    expect(p.sharedDataTypes).to.equal(DATA_TYPES);
    expect(p.participant).to.equal(patient.address);
    expect(p.studyId).to.equal(1);
    expect(p.rewarded).to.equal(false);
  });

  // 5. joinStudy increments currentParticipants
  it("joinStudy increments currentParticipants", async () => {
    await publishStudy();
    await registry.connect(patient).joinStudy(1, DATA_TYPES);
    const study = await registry.getStudy(1);
    expect(study.currentParticipants).to.equal(1);
  });

  // 6. joinStudy emits StudyJoined event
  it("joinStudy emits StudyJoined event", async () => {
    await publishStudy();
    await expect(registry.connect(patient).joinStudy(1, DATA_TYPES))
      .to.emit(registry, "StudyJoined")
      .withArgs(1, patient.address, DATA_TYPES);
  });

  // 7. double-join same study reverts AlreadyParticipating
  it("double-join same study reverts AlreadyParticipating", async () => {
    await publishStudy();
    await registry.connect(patient).joinStudy(1, DATA_TYPES);
    await expect(
      registry.connect(patient).joinStudy(1, DATA_TYPES)
    ).to.be.revertedWithCustomError(registry, "AlreadyParticipating");
  });

  // 8. join full study reverts StudyFull
  it("join full study reverts StudyFull", async () => {
    await publishStudy();
    await registry.connect(patient).joinStudy(1, DATA_TYPES);
    await registry.connect(patient2).joinStudy(1, DATA_TYPES);
    // maxParticipants = 2, now full
    const [, , , extra] = await ethers.getSigners();
    await expect(
      registry.connect(extra).joinStudy(1, DATA_TYPES)
    ).to.be.revertedWithCustomError(registry, "StudyFull");
  });

  // 9. join expired study reverts StudyExpired
  it("join expired study reverts StudyExpired", async () => {
    await publishStudy(3600); // 1 hour from now
    await time.increase(3601);
    await expect(
      registry.connect(patient).joinStudy(1, DATA_TYPES)
    ).to.be.revertedWithCustomError(registry, "StudyExpired");
  });

  // 10. getParticipantStudies returns correct studyIds
  it("getParticipantStudies returns correct studyIds", async () => {
    await publishStudy();
    await publishStudy();
    await registry.connect(patient).joinStudy(1, DATA_TYPES);
    await registry.connect(patient).joinStudy(2, DATA_TYPES);
    const studies = await registry.getParticipantStudies(patient.address);
    expect(studies.length).to.equal(2);
    expect(studies[0]).to.equal(1);
    expect(studies[1]).to.equal(2);
  });
});
