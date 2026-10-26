// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FlashBookExchange
 * @notice High-performance on-chain limit order book exchange with atomic settlement
 * @dev Non-custodial escrow architecture with deterministic price-time priority matching.
 */
contract FlashBookExchange is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // --- ENUMS & STRUCTS ---

    enum Side { BUY, SELL }
    enum OrderStatus { ACTIVE, FILLED, PARTIALLY_FILLED, CANCELLED }

    struct Order {
        uint256 id;
        address maker;
        Side side;
        uint256 price;        // Quote tokens (atomic units) per 1e18 Base tokens
        uint256 amount;       // Base token atomic units total
        uint256 filledAmount; // Base token atomic units filled
        uint256 timestamp;
        OrderStatus status;
    }

    // --- STATE VARIABLES ---

    IERC20 public immutable baseToken;   // e.g. FakeWETH (18 decimals)
    IERC20 public immutable quoteToken;  // e.g. FakeUSDT (6 decimals)
    uint8 public immutable baseDecimals;
    uint8 public immutable quoteDecimals;

    uint256 public constant BASE_UNIT = 1e18;
    uint256 public constant MAX_FEE_BPS = 100; // 1.00% max fee
    uint256 public feeBps; // Protocol fee in basis points (e.g. 10 = 0.10%)
    uint256 public nextOrderId = 1;

    uint256 public accumulatedBaseFees;
    uint256 public accumulatedQuoteFees;

    // Order storage
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) private _userOrderIds;

    // Active order IDs queues
    uint256[] public activeBuyOrderIds;
    uint256[] public activeSellOrderIds;

    // Index tracking for O(1) removal from active order arrays
    mapping(uint256 => uint256) private _activeBuyIndex;
    mapping(uint256 => uint256) private _activeSellIndex;

    // Max number of counter-orders matched per placement transaction to limit gas
    uint256 public maxMatchesPerPlacement = 10;

    // --- EVENTS ---

    event OrderPlaced(
        uint256 indexed orderId,
        address indexed maker,
        Side side,
        uint256 price,
        uint256 amount,
        uint256 timestamp
    );

    event OrderMatched(
        uint256 indexed buyOrderId,
        uint256 indexed sellOrderId,
        address indexed buyer,
        address seller,
        uint256 matchPrice,
        uint256 matchedBaseAmount,
        uint256 matchedQuoteAmount,
        uint256 feeQuote,
        uint256 timestamp
    );

    event OrderCancelled(
        uint256 indexed orderId,
        address indexed maker,
        uint256 refundedAmount,
        uint256 timestamp
    );

    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeesWithdrawn(address indexed to, uint256 baseAmount, uint256 quoteAmount);
    event MaxMatchesUpdated(uint256 oldMax, uint256 newMax);

    // --- CONSTRUCTOR ---

    constructor(
        address _baseToken,
        address _quoteToken,
        uint8 _baseDecimals,
        uint8 _quoteDecimals,
        uint256 _feeBps
    ) Ownable(msg.sender) {
        require(_baseToken != address(0) && _quoteToken != address(0), "Invalid token addresses");
        require(_feeBps <= MAX_FEE_BPS, "Fee exceeds maximum");

        baseToken = IERC20(_baseToken);
        quoteToken = IERC20(_quoteToken);
        baseDecimals = _baseDecimals;
        quoteDecimals = _quoteDecimals;
        feeBps = _feeBps;
    }

    // --- EXTERNAL TRADING FUNCTIONS ---

    /**
     * @notice Places a limit order with automatic matching against crossing resting orders.
     * @param side BUY or SELL
     * @param price Limit price (quote units per 1e18 base units)
     * @param amount Base token amount to trade (1e18 units)
     * @return orderId The assigned order ID
     */
    function placeOrder(
        Side side,
        uint256 price,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 orderId) {
        require(price > 0, "Price must be > 0");
        require(amount >= 1e14, "Amount below min size (0.0001)");

        orderId = nextOrderId++;
        uint256 remainingAmount = amount;

        // Pull initial escrow for full order before matching
        if (side == Side.BUY) {
            uint256 requiredQuote = (amount * price) / BASE_UNIT;
            require(requiredQuote > 0, "Quote amount too small");
            quoteToken.safeTransferFrom(msg.sender, address(this), requiredQuote);
        } else {
            baseToken.safeTransferFrom(msg.sender, address(this), amount);
        }

        // Initialize order record
        orders[orderId] = Order({
            id: orderId,
            maker: msg.sender,
            side: side,
            price: price,
            amount: amount,
            filledAmount: 0,
            timestamp: block.timestamp,
            status: OrderStatus.ACTIVE
        });
        _userOrderIds[msg.sender].push(orderId);

        emit OrderPlaced(orderId, msg.sender, side, price, amount, block.timestamp);

        // Auto-match against compatible resting orders
        uint256 matchedAmount = _executeAutoMatch(orderId, side, price, remainingAmount);

        if (matchedAmount > 0) {
            orders[orderId].filledAmount += matchedAmount;
            remainingAmount -= matchedAmount;
        }

        // Determine final order status
        if (remainingAmount == 0) {
            orders[orderId].status = OrderStatus.FILLED;
        } else {
            if (matchedAmount > 0) {
                orders[orderId].status = OrderStatus.PARTIALLY_FILLED;
            }
            // Add remaining unfilled portion to the active order book
            _insertActiveOrder(orderId, side);
        }

        return orderId;
    }

    /**
     * @notice Cancels an active or partially filled order and returns unfulfilled escrow
     * @param orderId The ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.id != 0, "Order does not exist");
        require(order.maker == msg.sender, "Not order maker");
        require(
            order.status == OrderStatus.ACTIVE || order.status == OrderStatus.PARTIALLY_FILLED,
            "Order not cancellable"
        );

        uint256 unfilledBase = order.amount - order.filledAmount;
        require(unfilledBase > 0, "Already filled");

        // Mark cancelled before transfers
        order.status = OrderStatus.CANCELLED;
        _removeActiveOrder(orderId, order.side);

        uint256 refundAmount;
        if (order.side == Side.BUY) {
            refundAmount = (unfilledBase * order.price) / BASE_UNIT;
            quoteToken.safeTransfer(msg.sender, refundAmount);
        } else {
            refundAmount = unfilledBase;
            baseToken.safeTransfer(msg.sender, refundAmount);
        }

        emit OrderCancelled(orderId, msg.sender, refundAmount, block.timestamp);
    }

    /**
     * @notice Explicitly matches two resting orders (can be called by any solver, keeper, or user)
     */
    function matchOrders(
        uint256 buyOrderId,
        uint256 sellOrderId
    ) external nonReentrant whenNotPaused {
        _settleSingleMatch(buyOrderId, sellOrderId);
    }

    // --- INTERNAL MATCHING LOGIC ---

    function _executeAutoMatch(
        uint256 takerOrderId,
        Side takerSide,
        uint256 takerPrice,
        uint256 takerRemainingBase
    ) internal returns (uint256 totalMatchedBase) {
        uint256 matchesExecuted = 0;

        while (
            takerRemainingBase > 0 &&
            matchesExecuted < maxMatchesPerPlacement
        ) {
            uint256 bestMakerOrderId = _findBestCounterOrder(takerSide, takerPrice);
            if (bestMakerOrderId == 0) {
                break; // No further compatible orders
            }

            uint256 matchedBase;
            if (takerSide == Side.BUY) {
                matchedBase = _settleSingleMatch(takerOrderId, bestMakerOrderId);
            } else {
                matchedBase = _settleSingleMatch(bestMakerOrderId, takerOrderId);
            }

            if (matchedBase == 0) {
                break;
            }

            totalMatchedBase += matchedBase;
            takerRemainingBase -= matchedBase;
            matchesExecuted++;
        }

        return totalMatchedBase;
    }

    function _findBestCounterOrder(
        Side takerSide,
        uint256 takerPrice
    ) internal view returns (uint256 bestOrderId) {
        if (takerSide == Side.BUY) {
            // Find lowest sell price <= takerPrice, earliest timestamp
            uint256 lowestPrice = type(uint256).max;
            for (uint256 i = 0; i < activeSellOrderIds.length; i++) {
                uint256 oId = activeSellOrderIds[i];
                Order storage o = orders[oId];
                if (o.status == OrderStatus.ACTIVE || o.status == OrderStatus.PARTIALLY_FILLED) {
                    if (o.price <= takerPrice) {
                        if (o.price < lowestPrice) {
                            lowestPrice = o.price;
                            bestOrderId = oId;
                        }
                    }
                }
            }
        } else {
            // Find highest buy price >= takerPrice, earliest timestamp
            uint256 highestPrice = 0;
            for (uint256 i = 0; i < activeBuyOrderIds.length; i++) {
                uint256 oId = activeBuyOrderIds[i];
                Order storage o = orders[oId];
                if (o.status == OrderStatus.ACTIVE || o.status == OrderStatus.PARTIALLY_FILLED) {
                    if (o.price >= takerPrice) {
                        if (o.price > highestPrice) {
                            highestPrice = o.price;
                            bestOrderId = oId;
                        }
                    }
                }
            }
        }
        return bestOrderId;
    }

    function _settleSingleMatch(
        uint256 buyOrderId,
        uint256 sellOrderId
    ) internal returns (uint256 matchedBase) {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];

        require(
            buyOrder.status == OrderStatus.ACTIVE || buyOrder.status == OrderStatus.PARTIALLY_FILLED,
            "Buy order not active"
        );
        require(
            sellOrder.status == OrderStatus.ACTIVE || sellOrder.status == OrderStatus.PARTIALLY_FILLED,
            "Sell order not active"
        );
        require(buyOrder.side == Side.BUY && sellOrder.side == Side.SELL, "Invalid order sides");
        require(buyOrder.price >= sellOrder.price, "Price cross condition not met");
        require(buyOrder.maker != sellOrder.maker, "Self-trade prevented");

        uint256 buyRemainingBase = buyOrder.amount - buyOrder.filledAmount;
        uint256 sellRemainingBase = sellOrder.amount - sellOrder.filledAmount;

        matchedBase = buyRemainingBase < sellRemainingBase ? buyRemainingBase : sellRemainingBase;
        require(matchedBase > 0, "Zero match size");

        // Execution price: Maker's resting price (the earlier order sets the price)
        uint256 executionPrice = sellOrder.timestamp <= buyOrder.timestamp ? sellOrder.price : buyOrder.price;
        uint256 matchedQuote = (matchedBase * executionPrice) / BASE_UNIT;
        require(matchedQuote > 0, "Matched quote is zero");

        // Protocol fee calculation (deducted from quote proceeds received by seller)
        uint256 feeQuote = 0;
        if (feeBps > 0) {
            feeQuote = (matchedQuote * feeBps) / 10000;
            accumulatedQuoteFees += feeQuote;
        }

        uint256 sellerProceedsQuote = matchedQuote - feeQuote;

        // Update fill states
        buyOrder.filledAmount += matchedBase;
        sellOrder.filledAmount += matchedBase;

        if (buyOrder.filledAmount == buyOrder.amount) {
            buyOrder.status = OrderStatus.FILLED;
            _removeActiveOrder(buyOrderId, Side.BUY);
        } else {
            buyOrder.status = OrderStatus.PARTIALLY_FILLED;
        }

        if (sellOrder.filledAmount == sellOrder.amount) {
            sellOrder.status = OrderStatus.FILLED;
            _removeActiveOrder(sellOrderId, Side.SELL);
        } else {
            sellOrder.status = OrderStatus.PARTIALLY_FILLED;
        }

        // Price improvement refund for buyer if executionPrice < buyOrder.price
        if (executionPrice < buyOrder.price) {
            uint256 budgetedQuote = (matchedBase * buyOrder.price) / BASE_UNIT;
            uint256 excessQuote = budgetedQuote - matchedQuote;
            if (excessQuote > 0) {
                quoteToken.safeTransfer(buyOrder.maker, excessQuote);
            }
        }

        // Deliver Base tokens to Buyer
        baseToken.safeTransfer(buyOrder.maker, matchedBase);

        // Deliver Quote tokens to Seller
        quoteToken.safeTransfer(sellOrder.maker, sellerProceedsQuote);

        emit OrderMatched(
            buyOrderId,
            sellOrderId,
            buyOrder.maker,
            sellOrder.maker,
            executionPrice,
            matchedBase,
            matchedQuote,
            feeQuote,
            block.timestamp
        );

        return matchedBase;
    }

    // --- ACTIVE ORDER BOOK MANAGEMENT ---

    function _insertActiveOrder(uint256 orderId, Side side) internal {
        if (side == Side.BUY) {
            _activeBuyIndex[orderId] = activeBuyOrderIds.length;
            activeBuyOrderIds.push(orderId);
        } else {
            _activeSellIndex[orderId] = activeSellOrderIds.length;
            activeSellOrderIds.push(orderId);
        }
    }

    function _removeActiveOrder(uint256 orderId, Side side) internal {
        if (side == Side.BUY) {
            uint256 idx = _activeBuyIndex[orderId];
            uint256 total = activeBuyOrderIds.length;
            if (idx < total && activeBuyOrderIds[idx] == orderId) {
                uint256 lastId = activeBuyOrderIds[total - 1];
                activeBuyOrderIds[idx] = lastId;
                _activeBuyIndex[lastId] = idx;
                activeBuyOrderIds.pop();
                delete _activeBuyIndex[orderId];
            }
        } else {
            uint256 idx = _activeSellIndex[orderId];
            uint256 total = activeSellOrderIds.length;
            if (idx < total && activeSellOrderIds[idx] == orderId) {
                uint256 lastId = activeSellOrderIds[total - 1];
                activeSellOrderIds[idx] = lastId;
                _activeSellIndex[lastId] = idx;
                activeSellOrderIds.pop();
                delete _activeSellIndex[orderId];
            }
        }
    }

    // --- VIEW FUNCTIONS ---

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getUserOrderIds(address user) external view returns (uint256[] memory) {
        return _userOrderIds[user];
    }

    function getActiveBuyOrderIds() external view returns (uint256[] memory) {
        return activeBuyOrderIds;
    }

    function getActiveSellOrderIds() external view returns (uint256[] memory) {
        return activeSellOrderIds;
    }

    function getActiveBuyOrderCount() external view returns (uint256) {
        return activeBuyOrderIds.length;
    }

    function getActiveSellOrderCount() external view returns (uint256) {
        return activeSellOrderIds.length;
    }

    // --- ADMIN & EMERGENCY CONTROLS ---

    function setFeeBps(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum");
        emit FeeUpdated(feeBps, _newFeeBps);
        feeBps = _newFeeBps;
    }

    function setMaxMatchesPerPlacement(uint256 _newMax) external onlyOwner {
        require(_newMax > 0 && _newMax <= 50, "Invalid max matches");
        emit MaxMatchesUpdated(maxMatchesPerPlacement, _newMax);
        maxMatchesPerPlacement = _newMax;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawFees(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        uint256 baseAmt = accumulatedBaseFees;
        uint256 quoteAmt = accumulatedQuoteFees;

        accumulatedBaseFees = 0;
        accumulatedQuoteFees = 0;

        if (baseAmt > 0) {
            baseToken.safeTransfer(to, baseAmt);
        }
        if (quoteAmt > 0) {
            quoteToken.safeTransfer(to, quoteAmt);
        }

        emit FeesWithdrawn(to, baseAmt, quoteAmt);
    }
}
