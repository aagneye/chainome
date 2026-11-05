// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IWorldID {
    /// @notice Verifies a World ID zero-knowledge proof.
    /// @param root        The latest Merkle root of the World ID identity set.
    /// @param groupId     The group the user is a member of (1 = Orb-verified).
    /// @param signalHash  Keccak256 hash of the signal the user verified against,
    ///                    right-shifted 8 bits to fit in a field element.
    /// @param nullifierHash Per-action, per-user nullifier (stable anonymous ID).
    /// @param externalNullifierHash Encodes the app ID + action string.
    /// @param proof       Groth16 zkSNARK proof (8 field elements).
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}
