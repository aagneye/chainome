import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("DatasetRegistry", function () {
  async function deployFixture() {
    const [owner, creator, buyer] = await ethers.getSigners();
    const HealthToken = await ethers.getContractFactory("HealthToken");
    const token = await HealthToken.deploy();

    const DatasetRegistry = await ethers.getContractFactory("DatasetRegistry");
    const registry = await DatasetRegistry.deploy(await token.getAddress());

    // mint GNM to buyer for purchase tests
    await token.grantRole(await token.MINTER_ROLE(), owner.address);
    await token.mint(buyer.address, ethers.parseEther("1000"));

    return { registry, token, owner, creator, buyer };
  }

  const NAME  = "BRCA2 South Asian Cohort";
  const SLUG  = "brca2-south-asia";
  const CID   = "QmTestCID123";
  const DESC  = "1,200 BRCA2 variant carriers";
  const CAT   = "genomics";
  const PRICE = ethers.parseEther("500");

  async function publishOne(registry: any, signer: any) {
    return registry.connect(signer).publishDataset(NAME, SLUG, CID, DESC, CAT, PRICE);
  }

  // 1. publishDataset stores correct fields
  it("publishDataset stores correct fields (name, slug, cid, creator)", async () => {
    const { registry, creator } = await deployFixture();
    await publishOne(registry, creator);
    const ds = await registry.getDataset(1);
    expect(ds.name).to.equal(NAME);
    expect(ds.slug).to.equal(SLUG);
    expect(ds.cid).to.equal(CID);
    expect(ds.creator).to.equal(creator.address);
    expect(ds.category).to.equal(CAT);
    expect(ds.priceInGNM).to.equal(PRICE);
  });

  // 2. publishDataset deploys unique token address
  it("publishDataset deploys unique token address", async () => {
    const { registry, creator } = await deployFixture();
    await registry.connect(creator).publishDataset(NAME, SLUG, CID, DESC, CAT, PRICE);
    await registry.connect(creator).publishDataset("Other", "other-slug", CID, DESC, CAT, PRICE);
    const ds1 = await registry.getDataset(1);
    const ds2 = await registry.getDataset(2);
    expect(ds1.tokenAddress).to.not.equal(ethers.ZeroAddress);
    expect(ds2.tokenAddress).to.not.equal(ethers.ZeroAddress);
    expect(ds1.tokenAddress).to.not.equal(ds2.tokenAddress);
  });

  // 3. publishDataset mints 1M tokens to creator
  it("publishDataset mints 1M tokens to creator", async () => {
    const { registry, creator } = await deployFixture();
    await publishOne(registry, creator);
    const ds = await registry.getDataset(1);
    const DatasetToken = await ethers.getContractAt("DatasetToken", ds.tokenAddress);
    const bal = await DatasetToken.balanceOf(creator.address);
    expect(bal).to.equal(ethers.parseEther("1000000"));
  });

  // 4. publishDataset increments datasetCount
  it("publishDataset increments datasetCount", async () => {
    const { registry, creator } = await deployFixture();
    expect(await registry.datasetCount()).to.equal(0);
    await publishOne(registry, creator);
    expect(await registry.datasetCount()).to.equal(1);
    await registry.connect(creator).publishDataset("B", "b-slug", CID, DESC, CAT, PRICE);
    expect(await registry.datasetCount()).to.equal(2);
  });

  // 5. publishDataset emits DatasetPublished with correct args
  it("publishDataset emits DatasetPublished with correct args", async () => {
    const { registry, creator } = await deployFixture();
    await expect(publishOne(registry, creator))
      .to.emit(registry, "DatasetPublished")
      .withArgs(1n, creator.address, SLUG, anyValue);
  });

  // 6. duplicate slug reverts SlugTaken
  it("duplicate slug reverts SlugTaken", async () => {
    const { registry, creator } = await deployFixture();
    await publishOne(registry, creator);
    await expect(publishOne(registry, creator))
      .to.be.revertedWithCustomError(registry, "SlugTaken");
  });

  // 7. getBySlug returns correct dataset
  it("getBySlug returns correct dataset", async () => {
    const { registry, creator } = await deployFixture();
    await publishOne(registry, creator);
    const ds = await registry.getBySlug(SLUG);
    expect(ds.slug).to.equal(SLUG);
    expect(ds.name).to.equal(NAME);
    expect(ds.id).to.equal(1n);
  });

  // 8. purchaseAccess transfers GNM to creator
  it("purchaseAccess transfers GNM to creator", async () => {
    const { registry, token, creator, buyer } = await deployFixture();
    await publishOne(registry, creator);
    await token.connect(buyer).approve(await registry.getAddress(), PRICE);

    const before = await token.balanceOf(creator.address);
    await registry.connect(buyer).purchaseAccess(1);
    const after = await token.balanceOf(creator.address);
    expect(after - before).to.equal(PRICE);
  });

  // 9. purchaseAccess sets hasAccess[id][buyer] = true
  it("purchaseAccess sets hasAccess[id][buyer] = true", async () => {
    const { registry, token, creator, buyer } = await deployFixture();
    await publishOne(registry, creator);
    await token.connect(buyer).approve(await registry.getAddress(), PRICE);

    expect(await registry.hasAccess(1, buyer.address)).to.equal(false);
    await registry.connect(buyer).purchaseAccess(1);
    expect(await registry.hasAccess(1, buyer.address)).to.equal(true);
  });

  // 10. purchaseAccess emits DatasetPurchased
  it("purchaseAccess emits DatasetPurchased", async () => {
    const { registry, token, creator, buyer } = await deployFixture();
    await publishOne(registry, creator);
    await token.connect(buyer).approve(await registry.getAddress(), PRICE);

    await expect(registry.connect(buyer).purchaseAccess(1))
      .to.emit(registry, "DatasetPurchased")
      .withArgs(1, buyer.address, PRICE);
  });
});
