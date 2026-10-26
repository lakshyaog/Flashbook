// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @notice Testnet mock token for FlashBook AI (FakeUSDT, FakeWETH)
 * @dev Supports customizable decimals and a public testnet faucet
 */
contract MockERC20 is ERC20, Ownable {
    uint8 private immutable _decimals;
    uint256 public immutable faucetAmount;
    uint256 public constant FAUCET_COOLDOWN = 1 minutes;

    mapping(address => uint256) public lastFaucetClaim;

    event FaucetClaimed(address indexed recipient, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply,
        uint256 faucetAmount_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _decimals = decimals_;
        faucetAmount = faucetAmount_;
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Allows any user to claim testnet tokens once per cooldown period
     */
    function faucet() external {
        require(
            lastFaucetClaim[msg.sender] == 0 ||
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet cooldown active"
        );
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        emit FaucetClaimed(msg.sender, faucetAmount);
    }

    /**
     * @notice Owner or automated testing helper to mint arbitrary amounts
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
