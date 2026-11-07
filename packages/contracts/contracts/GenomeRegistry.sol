// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IWorldID.sol";
import "./libs/ByteHasher.sol";
import "./HealthToken.sol";
import "./LabAttestation.sol";

/// @title GenomeRegistry
/// @notice One genome CID per Orb-verified human. World ID Incognito Action gate.
///         Sybil resistance: nullifier_hash is stable per-app per-user — duplicates
///         are rejected at the contract level, not just the application layer.
contract GenomeRegistry {
    using ByteHasher for bytes;

    // ── Errors ──────────────────────────────────────────────────────────────
    error AlreadySubmitted();
    error InvalidCID();
    error NotLabAttested();

    // ── State ────────────────────────────────────────────────────────────────
    IWorldID       public immutable worldId;
    HealthToken    public immutable token;
    LabAttestation public immutable labAttestation;
    uint256        public immutable externalNullifierHash;
    uint256     internal constant GROUP_ID = 0; // 0 = Device-verified (hackathon testing)

    mapping(uint256 nullifierHash => bool) public nullifierUsed;
    mapping(uint256 nullifierHash => string) public genomeCID;
    mapping(uint256 nullifierHash => uint256) public submittedAt;

    uint256 public totalSubmissions;

    // ── Events ───────────────────────────────────────────────────────────────
    event GenomeSubmitted(
        uint256 indexed nullifierHash,
        string cid,
        uint256 timestamp
    );

    // ── Constructor ──────────────────────────────────────────────────────────
    /// @param _worldId  Deployed World ID router on this chain.
    /// @param _appId    World ID app ID (e.g. "app_staging_abc123").
    /// @param _action   Action string (e.g. "genome_submission").
    /// @param _token    HealthToken to mint GENOME_REWARD on success.
    constructor(IWorldID _worldId, string memory _appId, string memory _action, HealthToken _token, LabAttestation _labAttestation) {
        worldId        = _worldId;
        token          = _token;
        labAttestation = _labAttestation;
        externalNullifierHash = abi
            .encodePacked(abi.encodePacked(_appId).hashToField(), _action)
            .hashToField();
    }

    // ── External ─────────────────────────────────────────────────────────────
    /// @notice Submit an encrypted genome CID. One per Orb-verified human.
    /// @param signal       Caller's wallet address (used as ZKP signal).
    /// @param root         Latest World ID Merkle root.
    /// @param nullifierHash Per-action per-user stable nullifier.
    /// @param proof        Groth16 proof (8 field elements).
    /// @param cid          IPFS CID of the encrypted SNP chip file.
    function submitGenome(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        string calldata cid
    ) external {
        if (nullifierUsed[nullifierHash]) revert AlreadySubmitted();
        if (bytes(cid).length == 0) revert InvalidCID();

        worldId.verifyProof(
            root,
            GROUP_ID,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifierHash,
            proof
        );

        if (!labAttestation.isValid(nullifierHash, cid)) revert NotLabAttested();

        nullifierUsed[nullifierHash] = true;
        genomeCID[nullifierHash] = cid;
        submittedAt[nullifierHash] = block.timestamp;
        unchecked { ++totalSubmissions; }

        token.mint(signal, token.GENOME_REWARD());

        emit GenomeSubmitted(nullifierHash, cid, block.timestamp);
    }

    /// @notice Check if a nullifier has already submitted a genome.
    function hasGenome(uint256 nullifierHash) external view returns (bool) {
        return nullifierUsed[nullifierHash];
    }
}
