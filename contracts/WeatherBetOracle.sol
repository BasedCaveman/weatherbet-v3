// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * WeatherBet Oracle v2
 * 
 * Simple oracle for the Parimutuel Pool.
 * Owner creates markets and resolves them with actual weather data.
 * 
 * Future: Replace with Chainlink/API3 weather feeds for trustless resolution.
 */

interface IWeatherBetPool {
    function createMarket(
        string calldata cityName,
        int256 lat,
        int256 lon,
        bool isRainMarket,
        uint256 historicalAvg,
        uint256 durationDays
    ) external returns (uint256 marketId);
    
    function resolveMarket(uint256 marketId, uint256 actualValue) external;
}

contract WeatherBetOracle {
    IWeatherBetPool public pool;
    address public owner;

    event MarketCreated(uint256 indexed marketId, string cityName);
    event MarketResolved(uint256 indexed marketId, uint256 actualValue);

    error Unauthorized();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _pool) {
        pool = IWeatherBetPool(_pool);
        owner = msg.sender;
    }

    function createMarket(
        string calldata cityName,
        int256 lat,
        int256 lon,
        bool isRainMarket,
        uint256 historicalAvg,
        uint256 durationDays
    ) external onlyOwner returns (uint256 marketId) {
        marketId = pool.createMarket(cityName, lat, lon, isRainMarket, historicalAvg, durationDays);
        emit MarketCreated(marketId, cityName);
    }

    function resolve(uint256 marketId, uint256 actualValue) external onlyOwner {
        pool.resolveMarket(marketId, actualValue);
        emit MarketResolved(marketId, actualValue);
    }

    function setPool(address _pool) external onlyOwner {
        if (_pool == address(0)) revert ZeroAddress();
        pool = IWeatherBetPool(_pool);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
