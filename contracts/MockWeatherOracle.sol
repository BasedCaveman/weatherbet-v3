// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockWeatherOracle
 * @notice Mock weather oracle for testing
 * @dev In production, this would integrate with Chainlink Data Streams
 */
contract MockWeatherOracle {
    // Market ID => actual weather value
    mapping(uint256 => uint256) public weatherData;
    
    // Oracle operator
    address public operator;
    
    event WeatherDataSubmitted(uint256 indexed marketId, uint256 value);
    
    constructor() {
        operator = msg.sender;
    }
    
    /**
     * @notice Submit weather data (for testing)
     * @param marketId Market to submit data for
     * @param value Actual weather value (rainfall in mm or temp in 0.1°C)
     */
    function submitWeatherData(uint256 marketId, uint256 value) external {
        require(msg.sender == operator, "Not operator");
        weatherData[marketId] = value;
        emit WeatherDataSubmitted(marketId, value);
    }
    
    /**
     * @notice Get weather data
     */
    function getWeatherData(uint256 marketId) external view returns (uint256) {
        return weatherData[marketId];
    }
    
    /**
     * @notice Update operator
     */
    function setOperator(address newOperator) external {
        require(msg.sender == operator, "Not operator");
        operator = newOperator;
    }
}
