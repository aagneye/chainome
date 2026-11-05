// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./HealthToken.sol";

/// @title RecordVault
/// @notice Per-wallet list of encrypted medical record CIDs (IPFS).
///         Each upload mints RECORD_REWARD GNM to the uploader.
///         No World ID needed — wallet = patient identity post-verification.
contract RecordVault {
    // ── Errors ───────────────────────────────────────────────────────────────
    error InvalidCID();
    error Unauthorized();

    // ── State ────────────────────────────────────────────────────────────────
    HealthToken public immutable token;

    struct Record {
        string  cid;
        string  recordType; // "prescription" | "lab" | "imaging" | "bill" | "other"
        uint256 uploadedAt;
    }

    mapping(address patient => Record[]) private _records;

    // ── Events ───────────────────────────────────────────────────────────────
    event RecordAdded(address indexed patient, string cid, string recordType, uint256 timestamp);

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(HealthToken _token) {
        token = _token;
    }

    // ── External ─────────────────────────────────────────────────────────────
    /// @notice Upload an encrypted record CID. Mints 10 GNM reward.
    function addRecord(string calldata cid, string calldata recordType) external {
        if (bytes(cid).length == 0) revert InvalidCID();

        _records[msg.sender].push(Record({
            cid:        cid,
            recordType: recordType,
            uploadedAt: block.timestamp
        }));

        token.mint(msg.sender, token.RECORD_REWARD());

        emit RecordAdded(msg.sender, cid, recordType, block.timestamp);
    }

    /// @notice Return all record CIDs for a patient (patient reads own records).
    function getRecords(address patient) external view returns (Record[] memory) {
        return _records[patient];
    }

    /// @notice Record count for a patient.
    function recordCount(address patient) external view returns (uint256) {
        return _records[patient].length;
    }
}
