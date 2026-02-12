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
