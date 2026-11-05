// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title ProtocolRegistry
 * @notice Immutable pre-registration of clinical trial protocols.
 *
 * Problem solved: ~40-60% of RCTs change primary endpoints between registration
 * and publication (COMPare project, Goldacre et al.). FDAAA §801 mandates
 * ClinicalTrials.gov registration but cannot prevent post-hoc protocol changes.
 *
 * Fix: hash the full protocol JSON on-chain BEFORE submitting to CT.gov.
 * When results publish, anyone can verify the hash matches the pre-registered
 * protocol. Outcome switching becomes cryptographically detectable.
 *
 * CT.gov registration is still legally required (FDAAA §801). This supplements.
 * Precedent: Irving & Holden, F1000Research 2016, DOI: 10.12688/f1000research.10418.1
 */
contract ProtocolRegistry {
    struct Protocol {
        bytes32  protocolHash;    // keccak256 of full protocol JSON
        address  sponsor;         // institution that registered
        uint256  registeredAt;    // timestamp — proves protocol existed before enrollment
        string   title;           // human-readable study title
        string   nctNumber;       // ClinicalTrials.gov NCT######### (set after CT.gov registration)
        bool     exists;
    }

    // protocolHash => Protocol
    mapping(bytes32 => Protocol) public protocols;

    // nctNumber => protocolHash (reverse lookup)
    mapping(string => bytes32) public nctToHash;

    event ProtocolRegistered(
        bytes32 indexed protocolHash,
        address indexed sponsor,
        uint256 registeredAt,
        string  title
    );

    event NCTLinked(
        bytes32 indexed protocolHash,
        string  nctNumber
    );

    event ResultsVerified(
        bytes32 indexed protocolHash,
        bytes32 indexed resultsHash,
        bool    matches
    );

    error AlreadyRegistered();
    error ProtocolNotFound();
    error NotSponsor();
    error NCTAlreadyLinked();

    /**
     * @notice Register a protocol hash before submitting to ClinicalTrials.gov.
     * @param protocolHash keccak256 of the complete protocol JSON document.
     * @param title        Human-readable study title for indexing.
     */
    function registerProtocol(bytes32 protocolHash, string calldata title) external {
        if (protocols[protocolHash].exists) revert AlreadyRegistered();

        protocols[protocolHash] = Protocol({
            protocolHash:  protocolHash,
            sponsor:       msg.sender,
            registeredAt:  block.timestamp,
            title:         title,
            nctNumber:     "",
            exists:        true
        });

        emit ProtocolRegistered(protocolHash, msg.sender, block.timestamp, title);
    }

    /**
     * @notice Link a CT.gov NCT number after completing ClinicalTrials.gov registration.
     *         Only the original sponsor can call this.
     */
    function linkNCT(bytes32 protocolHash, string calldata nctNumber) external {
        Protocol storage p = protocols[protocolHash];
        if (!p.exists)         revert ProtocolNotFound();
        if (p.sponsor != msg.sender) revert NotSponsor();
        if (bytes(p.nctNumber).length != 0) revert NCTAlreadyLinked();

        p.nctNumber = nctNumber;
        nctToHash[nctNumber] = protocolHash;

        emit NCTLinked(protocolHash, nctNumber);
    }

    /**
     * @notice Verify that published results match the pre-registered protocol.
     *         resultsHash = keccak256 of the CT.gov/EU CTR results posting.
     *         Returns true if resultsHash == protocolHash (same document = no drift).
     *         In practice, callers compare against an amendment chain.
     */
    function verifyProtocol(
        bytes32 protocolHash,
        bytes32 resultsHash
    ) external returns (bool matches) {
        if (!protocols[protocolHash].exists) revert ProtocolNotFound();
        matches = (protocolHash == resultsHash);
        emit ResultsVerified(protocolHash, resultsHash, matches);
    }

    function getProtocol(bytes32 protocolHash) external view returns (Protocol memory) {
        if (!protocols[protocolHash].exists) revert ProtocolNotFound();
        return protocols[protocolHash];
    }
}
