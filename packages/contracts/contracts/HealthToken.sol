// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title HealthToken (GNM)
/// @notice Reward token for genome + record contributions.
///         Minted by GenomeRegistry and RecordVault — never by users directly.
contract HealthToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant GENOME_REWARD  = 500 ether; // 500 GNM per genome upload
    uint256 public constant RECORD_REWARD  =  10 ether; // 10 GNM per record upload

    constructor(address admin) ERC20("GenomeChain", "GNM") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Mint GNM to a recipient. Only MINTER_ROLE.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
