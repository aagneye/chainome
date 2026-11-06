// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LabRegistry.sol";

contract LabAttestation {
    struct Attestation {
        bytes32 uid;
        address attester;
        uint256 nullifierHash;
        string  genomeCID;
        uint8   qualityScore;
        uint256 attestedAt;
        bool    revoked;
    }

    LabRegistry public immutable registry;

    mapping(bytes32  => Attestation) public attestations;
    mapping(uint256  => bytes32)     public nullifierToUID;

    event Attested(bytes32 indexed uid, address indexed lab, uint256 nullifierHash, string genomeCID);
    event Revoked(bytes32 indexed uid);

    error NotCertifiedLab();
    error AlreadyAttested();
    error NotAttester();

    constructor(LabRegistry _registry) {
        registry = _registry;
    }

    function attest(
        uint256 nullifierHash,
        string calldata genomeCID,
        uint8 qualityScore
    ) external returns (bytes32 uid) {
        if (!registry.certified(msg.sender)) revert NotCertifiedLab();
        if (nullifierToUID[nullifierHash] != bytes32(0)) revert AlreadyAttested();

        uid = keccak256(abi.encodePacked(msg.sender, nullifierHash, genomeCID, block.timestamp));

        attestations[uid] = Attestation({
            uid:          uid,
            attester:     msg.sender,
            nullifierHash: nullifierHash,
            genomeCID:    genomeCID,
            qualityScore: qualityScore,
            attestedAt:   block.timestamp,
            revoked:      false
        });

        nullifierToUID[nullifierHash] = uid;
        emit Attested(uid, msg.sender, nullifierHash, genomeCID);
    }

    function revoke(bytes32 uid) external {
        Attestation storage a = attestations[uid];
        if (a.attester != msg.sender) revert NotAttester();
        a.revoked = true;
        delete nullifierToUID[a.nullifierHash];
        emit Revoked(uid);
    }

    function isValid(uint256 nullifierHash, string calldata genomeCID) external view returns (bool) {
        bytes32 uid = nullifierToUID[nullifierHash];
        if (uid == bytes32(0)) return false;
        Attestation memory a = attestations[uid];
        return !a.revoked && keccak256(bytes(a.genomeCID)) == keccak256(bytes(genomeCID));
    }

    function getAttestation(bytes32 uid) external view returns (Attestation memory) {
        return attestations[uid];
    }

    function getAttestationByNullifier(uint256 nullifierHash) external view returns (Attestation memory) {
        return attestations[nullifierToUID[nullifierHash]];
    }
}
