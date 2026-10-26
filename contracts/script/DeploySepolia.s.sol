// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/FlashBookExchange.sol";

/**
 * @title DeploySepolia
 * @notice Production-grade deployment script for Ethereum Sepolia Testnet
 * @dev Usage:
 * export SEPOLIA_RPC="https://sepolia.infura.io/v3/..."
 * export PRIVATE_KEY="0x..."
 * export ETHERSCAN_API_KEY="..."
 * forge script script/DeploySepolia.s.sol:DeploySepolia --rpc-url $SEPOLIA_RPC --broadcast --verify -vvvv
 */
contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== FlashBook AI Sepolia Deployment ===");
        console.log("Deployer Address:", deployer);
        console.log("Deployer Balance:", deployer.balance);

        require(deployer.balance >= 0.05 ether, "Insufficient Sepolia ETH for deployment gas");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy FakeWETH (18 decimals, 1 WETH faucet claim)
        MockERC20 weth = new MockERC20(
            "Fake Ethereum",
            "FWETH",
            18,
            100_000 ether,
            1 ether
        );

        // 2. Deploy FakeUSDT (6 decimals, 1,000 USDT faucet claim)
        MockERC20 usdt = new MockERC20(
            "Fake Tether USD",
            "FUSDT",
            6,
            100_000_000 * 1e6,
            1_000 * 1e6
        );

        // 3. Deploy FlashBookExchange with 10 bps (0.10%) protocol fee
        FlashBookExchange exchange = new FlashBookExchange(
            address(weth),
            address(usdt),
            18,
            6,
            10
        );

        vm.stopBroadcast();

        console.log("=== Deployed Contract Addresses on Sepolia ===");
        console.log("FakeWETH (Base)   :", address(weth));
        console.log("FakeUSDT (Quote)  :", address(usdt));
        console.log("FlashBookExchange :", address(exchange));
        console.log("Verify on Etherscan: https://sepolia.etherscan.io/address/", address(exchange));
    }
}
