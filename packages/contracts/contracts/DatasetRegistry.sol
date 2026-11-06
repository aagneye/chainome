// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Minimal ERC-20 token deployed per dataset
contract DatasetToken is ERC20 {
    constructor(string memory name, string memory symbol, address recipient) ERC20(name, symbol) {
        _mint(recipient, 1_000_000 * 10**18); // 1M tokens to creator
    }
}

contract DatasetRegistry {
    struct Dataset {
        uint256 id;
        address creator;
        string  name;
        string  slug;        // used for ENS subname: slug.genomechain.eth
        string  cid;         // IPFS CID of encrypted dataset
        string  description;
        string  category;    // "genomics" | "imaging" | "clinical" | "billing"
        address tokenAddress;
        uint256 priceInGNM;  // cost to buy 1 dataset token (in wei)
        uint256 createdAt;
    }

    IERC20  public immutable gnmToken;
    uint256 public datasetCount;

    mapping(uint256 => Dataset) public datasets;
    mapping(string  => uint256) public slugToId;      // slug → dataset id
    mapping(address => uint256[]) public creatorDatasets;
    mapping(uint256 => mapping(address => bool)) public hasAccess; // id => buyer => bool

    event DatasetPublished(uint256 indexed id, address indexed creator, string slug, address tokenAddress);
    event DatasetPurchased(uint256 indexed id, address indexed buyer, uint256 paid);

    error SlugTaken();
    error DatasetNotFound();
    error InsufficientPayment();
    error AlreadyOwned();

    constructor(IERC20 _gnmToken) {
        gnmToken = _gnmToken;
    }

    function publishDataset(
        string calldata name,
        string calldata slug,
        string calldata cid,
        string calldata description,
        string calldata category,
        uint256         priceInGNM
    ) external returns (uint256 id) {
        if (slugToId[slug] != 0) revert SlugTaken();

        id = ++datasetCount;

        // Deploy a unique ERC-20 token for this dataset
        string memory symbol = _toUpper(slug);
        DatasetToken token = new DatasetToken(name, symbol, msg.sender);

        datasets[id] = Dataset({
            id:           id,
            creator:      msg.sender,
            name:         name,
            slug:         slug,
            cid:          cid,
            description:  description,
            category:     category,
            tokenAddress: address(token),
            priceInGNM:   priceInGNM,
            createdAt:    block.timestamp
        });

        slugToId[slug]     = id;
        hasAccess[id][msg.sender] = true; // creator always has access
        creatorDatasets[msg.sender].push(id);

        emit DatasetPublished(id, msg.sender, slug, address(token));
    }

    function purchaseAccess(uint256 id) external {
        Dataset storage ds = datasets[id];
        if (ds.id == 0)                   revert DatasetNotFound();
        if (hasAccess[id][msg.sender])    revert AlreadyOwned();

        gnmToken.transferFrom(msg.sender, ds.creator, ds.priceInGNM);
        hasAccess[id][msg.sender] = true;

        emit DatasetPurchased(id, msg.sender, ds.priceInGNM);
    }

    function getDataset(uint256 id) external view returns (Dataset memory) {
        return datasets[id];
    }

    function getCreatorDatasets(address creator) external view returns (uint256[] memory) {
        return creatorDatasets[creator];
    }

    function getBySlug(string calldata slug) external view returns (Dataset memory) {
        uint256 id = slugToId[slug];
        if (id == 0) revert DatasetNotFound();
        return datasets[id];
    }

    // Simple uppercase for symbol generation (ASCII only)
    function _toUpper(string memory str) internal pure returns (string memory) {
        bytes memory b = bytes(str);
        bytes memory result = new bytes(b.length > 6 ? 6 : b.length); // max 6 chars for symbol
        for (uint i = 0; i < result.length; i++) {
            bytes1 c = b[i];
            if (c >= 0x61 && c <= 0x7A) {
                result[i] = bytes1(uint8(c) - 32);
            } else if (c == 0x2D || c == 0x5F) { // - or _
                result[i] = 0x44; // D (for Dataset)
            } else {
                result[i] = c;
            }
        }
        return string(result);
    }
}
