// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUSDm {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IWeatherOrderBook {
    function setOracle(address _oracle) external;
}

contract WeatherBetTreasury {
    address public owner;
    address public orderBook;
    IUSDm public constant usdm = IUSDm(0x4605821e41B3e95C78C2e3871bc4597a0939189A);

    event FundsWithdrawn(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OrderBookUpdated(address indexed newOrderBook);

    error Unauthorized();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function getBalance() external view returns (uint256) {
        return usdm.balanceOf(address(this));
    }

    function withdraw(uint256 amount) external onlyOwner {
        if (!usdm.transfer(owner, amount)) revert TransferFailed();
        emit FundsWithdrawn(owner, amount);
    }

    function withdrawTo(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert Unauthorized();
        if (!usdm.transfer(to, amount)) revert TransferFailed();
        emit FundsWithdrawn(to, amount);
    }

    function setOrderBook(address _orderBook) external onlyOwner {
        orderBook = _orderBook;
        emit OrderBookUpdated(_orderBook);
    }

    function updateOracleOnOrderBook(address _oracle) external onlyOwner {
        IWeatherOrderBook(orderBook).setOracle(_oracle);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    receive() external payable {}

    function withdrawETH(uint256 amount) external onlyOwner {
        (bool success, ) = owner.call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
