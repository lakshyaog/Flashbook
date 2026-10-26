// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/FlashBookExchange.sol";

contract DeployFlashBook is Script {
    function run() external returns (
        MockERC20 weth,
        MockERC20 usdt,
        FlashBookExchange exchange
    ) {
        uint256 deployerPrivateKey;
        
        // Support env private key or default local anvil key
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            // Default Anvil Account #0
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy FakeWETH (18 decimals)
        weth = new MockERC20(
            "Fake Ethereum",
            "FWETH",
            18,
            1_000_000 ether,
            1 ether // 1 WETH faucet claim
        );

        // 2. Deploy FakeUSDT (6 decimals)
        usdt = new MockERC20(
            "Fake Tether USD",
            "FUSDT",
            6,
            1_000_000 * 1e6,
            1_000 * 1e6 // 1,000 USDT faucet claim
        );

        // 3. Deploy Exchange with 10 bps fee (0.10%)
        exchange = new FlashBookExchange(
            address(weth),
            address(usdt),
            18,
            6,
            10
        );

        vm.stopBroadcast();

        console.log("=== FlashBook AI Deployment ===");
        console.log("FakeWETH (Base)   :", address(weth));
        console.log("FakeUSDT (Quote)  :", address(usdt));
        console.log("FlashBookExchange :", address(exchange));
    }
}
