// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PactEscrow} from "../src/PactEscrow.sol";

contract DeployPactEscrow is Script {
    function run() external returns (PactEscrow) {
        uint256 deployerPrivateKey =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));

        vm.startBroadcast(deployerPrivateKey);
        PactEscrow pactEscrow = new PactEscrow();
        vm.stopBroadcast();

        console.log("PactEscrow deployed at:", address(pactEscrow));

        return pactEscrow;
    }
}
