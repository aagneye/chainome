// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ConsentManager
/// @notice On-chain consent audit trail — 21 CFR Part 11 compatible timestamping.
///         Patients grant / revoke institutional access to data types.
///         Smart contract cannot replace IRB or WHO ICTRP registration.
contract ConsentManager {
    // ── Errors ───────────────────────────────────────────────────────────────
    error AlreadyGranted();
    error NotGranted();
    error ExpiredConsent();
    error InvalidExpiry();

    // ── Types ────────────────────────────────────────────────────────────────
    struct ConsentGrant {
        bool    active;
        uint64  expiry;      // unix timestamp; 0 = no expiry
        bytes32 dataTypes;   // bitmask: bit 0=genome, 1=records, 2=imaging, ...
        uint256 grantedAt;
    }

    // ── State ────────────────────────────────────────────────────────────────
    // patient => institution => grant
    mapping(address => mapping(address => ConsentGrant)) public consents;

    // ── Events ───────────────────────────────────────────────────────────────
    event ConsentGranted(
        address indexed patient,
        address indexed institution,
        bytes32 dataTypes,
        uint64  expiry,
        uint256 timestamp
    );
    event ConsentRevoked(
        address indexed patient,
        address indexed institution,
        uint256 timestamp
    );

    // ── External ─────────────────────────────────────────────────────────────
    /// @notice Grant an institution access to specified data types.
    /// @param institution  Address of the research org / pharma / hospital.
    /// @param expiry       Unix timestamp after which consent is void (0 = indefinite).
    /// @param dataTypes    Bitmask of data categories.
    function grantConsent(
        address institution,
        uint64  expiry,
        bytes32 dataTypes
    ) external {
        if (expiry != 0 && expiry <= block.timestamp) revert InvalidExpiry();

        consents[msg.sender][institution] = ConsentGrant({
            active:    true,
            expiry:    expiry,
            dataTypes: dataTypes,
            grantedAt: block.timestamp
        });

        emit ConsentGranted(msg.sender, institution, dataTypes, expiry, block.timestamp);
    }

    /// @notice Revoke consent from an institution.
    function revokeConsent(address institution) external {
        ConsentGrant storage grant = consents[msg.sender][institution];
        if (!grant.active) revert NotGranted();
        grant.active = false;
        emit ConsentRevoked(msg.sender, institution, block.timestamp);
    }

    /// @notice Check whether an institution has valid, unexpired consent from a patient.
    function hasConsent(address patient, address institution) external view returns (bool) {
        ConsentGrant storage grant = consents[patient][institution];
        if (!grant.active) return false;
        if (grant.expiry != 0 && block.timestamp > grant.expiry) return false;
        return true;
    }

    /// @notice Full consent details for a patient-institution pair.
    function getConsent(
        address patient,
        address institution
    ) external view returns (ConsentGrant memory) {
        return consents[patient][institution];
    }
}
