// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/MockERC20.sol";
import "../src/FlashBookExchange.sol";

contract FlashBookExchangeTest is Test {
    MockERC20 public weth; // Base token (18 decimals)
    MockERC20 public usdt; // Quote token (6 decimals)
    FlashBookExchange public exchange;

    address public owner = address(this);
    address public alice = address(0xAA11);
    address public bob = address(0xBB22);
    address public charlie = address(0xCC33);

    uint256 public constant INITIAL_WETH = 100 ether;
    uint256 public constant INITIAL_USDT = 300_000 * 1e6; // 300,000 USDT

    function setUp() public {
        // Deploy Mock Tokens
        weth = new MockERC20("Fake WETH", "FWETH", 18, 1_000_000 ether, 1 ether);
        usdt = new MockERC20("Fake USDT", "FUSDT", 6, 1_000_000 * 1e6, 1_000 * 1e6);

        // Deploy Exchange with 10 bps (0.1%) fee
        exchange = new FlashBookExchange(
            address(weth),
            address(usdt),
            18,
            6,
            10 // 0.10%
        );

        // Fund Alice and Bob
        weth.mint(alice, INITIAL_WETH);
        usdt.mint(alice, INITIAL_USDT);

        weth.mint(bob, INITIAL_WETH);
        usdt.mint(bob, INITIAL_USDT);

        // Approvals
        vm.prank(alice);
        weth.approve(address(exchange), type(uint256).max);
        vm.prank(alice);
        usdt.approve(address(exchange), type(uint256).max);

        vm.prank(bob);
        weth.approve(address(exchange), type(uint256).max);
        vm.prank(bob);
        usdt.approve(address(exchange), type(uint256).max);
    }

    // --- TEST: FAUCET & SETUP ---

    function test_FaucetMinting() public {
        vm.prank(charlie);
        weth.faucet();
        assertEq(weth.balanceOf(charlie), 1 ether);

        vm.prank(charlie);
        usdt.faucet();
        assertEq(usdt.balanceOf(charlie), 1_000 * 1e6);

        // Cooldown reverts immediately
        vm.expectRevert("Faucet cooldown active");
        vm.prank(charlie);
        weth.faucet();
    }

    // --- TEST: ORDER PLACEMENT & ESCROW ---

    function test_PlaceBuyOrder_EscrowsQuoteToken() public {
        uint256 price = 3_000 * 1e6; // 3,000 USDT / WETH
        uint256 amount = 1 ether;    // 1 WETH
        uint256 requiredUSDT = 3_000 * 1e6;

        uint256 aliceUsdtBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        uint256 orderId = exchange.placeOrder(FlashBookExchange.Side.BUY, price, amount);

        assertEq(orderId, 1);
        assertEq(usdt.balanceOf(alice), aliceUsdtBefore - requiredUSDT);
        assertEq(usdt.balanceOf(address(exchange)), requiredUSDT);

        FlashBookExchange.Order memory order = exchange.getOrder(orderId);
        assertEq(order.maker, alice);
        assertEq(uint8(order.side), uint8(FlashBookExchange.Side.BUY));
        assertEq(order.price, price);
        assertEq(order.amount, amount);
        assertEq(order.filledAmount, 0);
        assertEq(uint8(order.status), uint8(FlashBookExchange.OrderStatus.ACTIVE));

        assertEq(exchange.getActiveBuyOrderCount(), 1);
    }

    function test_PlaceSellOrder_EscrowsBaseToken() public {
        uint256 price = 3_200 * 1e6;
        uint256 amount = 2 ether;

        uint256 aliceWethBefore = weth.balanceOf(alice);

        vm.prank(alice);
        uint256 orderId = exchange.placeOrder(FlashBookExchange.Side.SELL, price, amount);

        assertEq(orderId, 1);
        assertEq(weth.balanceOf(alice), aliceWethBefore - amount);
        assertEq(weth.balanceOf(address(exchange)), amount);

        assertEq(exchange.getActiveSellOrderCount(), 1);
    }

    function test_PlaceOrder_RevertsOnZeroPriceOrAmount() public {
        vm.prank(alice);
        vm.expectRevert("Price must be > 0");
        exchange.placeOrder(FlashBookExchange.Side.BUY, 0, 1 ether);

        vm.prank(alice);
        vm.expectRevert("Amount below min size (0.0001)");
        exchange.placeOrder(FlashBookExchange.Side.BUY, 3_000 * 1e6, 1e13);
    }

    // --- TEST: ORDER CANCELLATION ---

    function test_CancelBuyOrder_FullRefund() public {
        uint256 price = 3_000 * 1e6;
        uint256 amount = 1 ether;
        uint256 requiredUSDT = 3_000 * 1e6;

        vm.prank(alice);
        uint256 orderId = exchange.placeOrder(FlashBookExchange.Side.BUY, price, amount);

        uint256 aliceUsdtAfterPlace = usdt.balanceOf(alice);

        // Cancel order
        vm.prank(alice);
        exchange.cancelOrder(orderId);

        // Verify state & full refund
        assertEq(usdt.balanceOf(alice), aliceUsdtAfterPlace + requiredUSDT);
        assertEq(exchange.getActiveBuyOrderCount(), 0);

        FlashBookExchange.Order memory order = exchange.getOrder(orderId);
        assertEq(uint8(order.status), uint8(FlashBookExchange.OrderStatus.CANCELLED));
    }

    function test_CancelOrder_RevertsIfUnauthorized() public {
        vm.prank(alice);
        uint256 orderId = exchange.placeOrder(FlashBookExchange.Side.BUY, 3000 * 1e6, 1 ether);

        vm.prank(bob);
        vm.expectRevert("Not order maker");
        exchange.cancelOrder(orderId);
    }

    // --- TEST: EXACT ORDER MATCHING & ATOMIC SETTLEMENT ---

    function test_ExactMatch_AtomicSettlement() public {
        uint256 price = 3_000 * 1e6;
        uint256 amount = 1 ether;

        // Alice places Sell: 1 WETH @ 3000 USDT
        vm.prank(alice);
        uint256 sellOrderId = exchange.placeOrder(FlashBookExchange.Side.SELL, price, amount);

        uint256 aliceUsdtBefore = usdt.balanceOf(alice);
        uint256 bobWethBefore = weth.balanceOf(bob);

        // Bob places Buy: 1 WETH @ 3000 USDT -> matches Alice immediately
        vm.prank(bob);
        uint256 buyOrderId = exchange.placeOrder(FlashBookExchange.Side.BUY, price, amount);

        // Both orders should be FILLED
        FlashBookExchange.Order memory sellOrder = exchange.getOrder(sellOrderId);
        FlashBookExchange.Order memory buyOrder = exchange.getOrder(buyOrderId);

        assertEq(uint8(sellOrder.status), uint8(FlashBookExchange.OrderStatus.FILLED));
        assertEq(uint8(buyOrder.status), uint8(FlashBookExchange.OrderStatus.FILLED));
        assertEq(exchange.getActiveBuyOrderCount(), 0);
        assertEq(exchange.getActiveSellOrderCount(), 0);

        // Buyer Bob received 1 WETH
        assertEq(weth.balanceOf(bob), bobWethBefore + amount);

        // Seller Alice received 3000 USDT minus 0.1% fee (3 USDT)
        uint256 expectedFee = (3_000 * 1e6 * 10) / 10000; // 3 USDT
        assertEq(usdt.balanceOf(alice), aliceUsdtBefore + 3_000 * 1e6 - expectedFee);
        assertEq(exchange.accumulatedQuoteFees(), expectedFee);
    }

    // --- TEST: PARTIAL FILLS ---

    function test_PartialFill_OrderRemainsActive() public {
        uint256 price = 3_000 * 1e6;

        // Alice places Sell: 2 WETH @ 3000 USDT
        vm.prank(alice);
        uint256 sellOrderId = exchange.placeOrder(FlashBookExchange.Side.SELL, price, 2 ether);

        // Bob places Buy: 1 WETH @ 3000 USDT
        vm.prank(bob);
        uint256 buyOrderId = exchange.placeOrder(FlashBookExchange.Side.BUY, price, 1 ether);

        // Check statuses
        FlashBookExchange.Order memory sellOrder = exchange.getOrder(sellOrderId);
        FlashBookExchange.Order memory buyOrder = exchange.getOrder(buyOrderId);

        assertEq(uint8(sellOrder.status), uint8(FlashBookExchange.OrderStatus.PARTIALLY_FILLED));
        assertEq(sellOrder.filledAmount, 1 ether);
        assertEq(uint8(buyOrder.status), uint8(FlashBookExchange.OrderStatus.FILLED));

        // Active sells still has Alice's order
        assertEq(exchange.getActiveSellOrderCount(), 1);

        // Alice can cancel the remaining 1 WETH
        uint256 aliceWethBeforeCancel = weth.balanceOf(alice);
        vm.prank(alice);
        exchange.cancelOrder(sellOrderId);

        assertEq(weth.balanceOf(alice), aliceWethBeforeCancel + 1 ether);
        assertEq(exchange.getActiveSellOrderCount(), 0);
    }

    // --- TEST: PRICE IMPROVEMENT REFUND ---

    function test_PriceImprovement_BuyerRefund() public {
        // Alice puts up a cheap sell: 1 WETH @ 2,800 USDT
        vm.prank(alice);
        exchange.placeOrder(FlashBookExchange.Side.SELL, 2_800 * 1e6, 1 ether);

        // Bob places Buy: 1 WETH with limit price @ 3,000 USDT (budget 3,000 USDT)
        uint256 bobUsdtBefore = usdt.balanceOf(bob);

        vm.prank(bob);
        exchange.placeOrder(FlashBookExchange.Side.BUY, 3_000 * 1e6, 1 ether);

        // Bob should get filled at Alice's resting price (2,800 USDT), and refunded 200 USDT!
        assertEq(usdt.balanceOf(bob), bobUsdtBefore - 2_800 * 1e6);
        assertEq(weth.balanceOf(bob), INITIAL_WETH + 1 ether);
    }

    // --- TEST: PAUSABLE CIRCUIT BREAKER ---

    function test_Pausable_CircuitBreaker() public {
        exchange.pause();

        // Placing orders reverts
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        exchange.placeOrder(FlashBookExchange.Side.BUY, 3_000 * 1e6, 1 ether);

        exchange.unpause();

        // Placing works after unpause
        vm.prank(alice);
        uint256 orderId = exchange.placeOrder(FlashBookExchange.Side.BUY, 3_000 * 1e6, 1 ether);

        // Pause again - cancellations MUST still work for user fund safety
        exchange.pause();
        vm.prank(alice);
        exchange.cancelOrder(orderId);
        assertEq(exchange.getActiveBuyOrderCount(), 0);
    }

    // --- TEST: WITHDRAW FEES ---

    function test_FeeWithdrawal() public {
        // Execute trade to accumulate fees
        vm.prank(alice);
        exchange.placeOrder(FlashBookExchange.Side.SELL, 3_000 * 1e6, 1 ether);
        vm.prank(bob);
        exchange.placeOrder(FlashBookExchange.Side.BUY, 3_000 * 1e6, 1 ether);

        uint256 accruedQuoteFees = exchange.accumulatedQuoteFees();
        assertTrue(accruedQuoteFees > 0);

        uint256 ownerUsdtBefore = usdt.balanceOf(owner);
        exchange.withdrawFees(owner);

        assertEq(usdt.balanceOf(owner), ownerUsdtBefore + accruedQuoteFees);
        assertEq(exchange.accumulatedQuoteFees(), 0);
    }

    // --- FUZZ TEST: PRESERVATION OF FUNDS INVARIANT ---

    function testFuzz_PreservationOfFunds(uint256 rawPrice, uint256 rawAmount) public {
        // Bound price: 100 USDT to 50,000 USDT ($100 to $50,000)
        uint256 price = bound(rawPrice, 100 * 1e6, 50_000 * 1e6);
        // Bound amount: 0.01 WETH to 5 WETH
        uint256 amount = bound(rawAmount, 1e16, 5 ether);

        vm.prank(alice);
        uint256 sellId = exchange.placeOrder(FlashBookExchange.Side.SELL, price, amount);

        vm.prank(bob);
        uint256 buyId = exchange.placeOrder(FlashBookExchange.Side.BUY, price, amount);

        // Both filled
        assertEq(uint8(exchange.getOrder(sellId).status), uint8(FlashBookExchange.OrderStatus.FILLED));
        assertEq(uint8(exchange.getOrder(buyId).status), uint8(FlashBookExchange.OrderStatus.FILLED));

        // Contract holds only accrued protocol fees, zero stuck user funds
        uint256 fee = exchange.accumulatedQuoteFees();
        assertEq(usdt.balanceOf(address(exchange)), fee);
        assertEq(weth.balanceOf(address(exchange)), 0);
    }
}
