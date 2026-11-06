// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LabRegistry is Ownable {
    mapping(address => bool) public certified;
    mapping(address => string) public labName;

    event LabCertified(address indexed lab, string name);
    event LabRevoked(address indexed lab);

    error AlreadyCertified();
    error NotCertified();

    constructor() Ownable(msg.sender) {}

    function certifyLab(address lab, string calldata name) external onlyOwner {
        if (certified[lab]) revert AlreadyCertified();
        certified[lab] = true;
        labName[lab] = name;
        emit LabCertified(lab, name);
    }

    function revokeLab(address lab) external onlyOwner {
        if (!certified[lab]) revert NotCertified();
        certified[lab] = false;
        emit LabRevoked(lab);
    }
}
