// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library ByteHasher {
    /// @notice Hash arbitrary bytes into a World ID field element (BN254 scalar).
    /// @dev Keccak256 is 256-bit; BN254 scalar field is ~254-bit.
    ///      Right-shifting 8 bits guarantees the result fits in the field.
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}
