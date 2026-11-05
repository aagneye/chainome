// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IWorldID} from "../interfaces/IWorldID.sol";

contract MockWorldID is IWorldID {
    bool public shouldRevert;

    function setShouldRevert(bool _revert) external {
        shouldRevert = _revert;
    }

    function verifyProof(
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256[8] calldata
    ) external view override {
        if (shouldRevert) revert("MockWorldID: proof invalid");
    }
}
