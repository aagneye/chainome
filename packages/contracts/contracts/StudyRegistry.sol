// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StudyRegistry {
    enum StudyStatus { Active, Paused, Completed }

    struct Study {
        uint256 id;
        address sponsor;
        string  title;
        string  description;
        // What data types are requested (matches ConsentManager dataTypes bytes32)
        bytes32 requiredDataTypes;
        bool    requiresGenome;
        uint256 rewardPerParticipant; // in GNM (wei)
        uint256 maxParticipants;
        uint256 currentParticipants;
        uint256 deadline;             // unix timestamp
        StudyStatus status;
        string  irbProtocolHash;      // links to ProtocolRegistry
    }

    struct Participation {
        uint256 studyId;
        address participant;
        uint256 joinedAt;
        bytes32 sharedDataTypes;      // subset of requiredDataTypes the patient agreed to share
        bool    rewarded;
    }

    IERC20 public immutable token;

    uint256 public studyCount;
    mapping(uint256 => Study) public studies;
    // studyId => participant => Participation
    mapping(uint256 => mapping(address => Participation)) public participations;
    // studyId => list of participants
    mapping(uint256 => address[]) public studyParticipants;
    // participant => list of studyIds they joined
    mapping(address => uint256[]) public participantStudies;

    event StudyPublished(uint256 indexed studyId, address indexed sponsor, string title, uint256 reward);
    event StudyJoined(uint256 indexed studyId, address indexed participant, bytes32 sharedDataTypes);
    event RewardDistributed(uint256 indexed studyId, address indexed participant, uint256 amount);
    event StudyStatusChanged(uint256 indexed studyId, StudyStatus status);

    error StudyNotFound();
    error StudyNotActive();
    error StudyFull();
    error StudyExpired();
    error AlreadyParticipating();
    error NotSponsor();
    error InsufficientRewardBalance();

    constructor(IERC20 _token) {
        token = _token;
    }

    function publishStudy(
        string calldata title,
        string calldata description,
        bytes32 requiredDataTypes,
        bool    requiresGenome,
        uint256 rewardPerParticipant,
        uint256 maxParticipants,
        uint256 deadline,
        string calldata irbProtocolHash
    ) external returns (uint256 studyId) {
        studyId = ++studyCount;
        studies[studyId] = Study({
            id:                   studyId,
            sponsor:              msg.sender,
            title:                title,
            description:          description,
            requiredDataTypes:    requiredDataTypes,
            requiresGenome:       requiresGenome,
            rewardPerParticipant: rewardPerParticipant,
            maxParticipants:      maxParticipants,
            currentParticipants:  0,
            deadline:             deadline,
            status:               StudyStatus.Active,
            irbProtocolHash:      irbProtocolHash
        });
        emit StudyPublished(studyId, msg.sender, title, rewardPerParticipant);
    }

    function joinStudy(uint256 studyId, bytes32 sharedDataTypes) external {
        Study storage study = studies[studyId];
        if (study.id == 0)                              revert StudyNotFound();
        if (study.status != StudyStatus.Active)         revert StudyNotActive();
        if (study.currentParticipants >= study.maxParticipants) revert StudyFull();
        if (block.timestamp > study.deadline)           revert StudyExpired();
        if (participations[studyId][msg.sender].joinedAt != 0) revert AlreadyParticipating();

        participations[studyId][msg.sender] = Participation({
            studyId:         studyId,
            participant:     msg.sender,
            joinedAt:        block.timestamp,
            sharedDataTypes: sharedDataTypes,
            rewarded:        false
        });

        studyParticipants[studyId].push(msg.sender);
        participantStudies[msg.sender].push(studyId);
        study.currentParticipants++;

        emit StudyJoined(studyId, msg.sender, sharedDataTypes);
    }

    // Sponsor rewards a participant after data contribution is verified
    function distributeReward(uint256 studyId, address participant) external {
        Study storage study = studies[studyId];
        if (study.sponsor != msg.sender)                revert NotSponsor();
        Participation storage p = participations[studyId][participant];
        if (p.joinedAt == 0)                            revert StudyNotFound();
        if (p.rewarded)                                 return; // idempotent

        p.rewarded = true;
        token.transferFrom(msg.sender, participant, study.rewardPerParticipant);
        emit RewardDistributed(studyId, participant, study.rewardPerParticipant);
    }

    function setStatus(uint256 studyId, StudyStatus status) external {
        if (studies[studyId].sponsor != msg.sender) revert NotSponsor();
        studies[studyId].status = status;
        emit StudyStatusChanged(studyId, status);
    }

    function getStudy(uint256 studyId) external view returns (Study memory) {
        return studies[studyId];
    }

    function getParticipants(uint256 studyId) external view returns (address[] memory) {
        return studyParticipants[studyId];
    }

    function getParticipantStudies(address participant) external view returns (uint256[] memory) {
        return participantStudies[participant];
    }
}
