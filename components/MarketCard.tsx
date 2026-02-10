'use client';

import { useState } from 'react';
import { Market, useMarketPrices } from '../hooks/useOrderBook';

interface MarketCardProps {
  market: Market;
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
  onBet: (marketId: number, isYes: boolean, amount: number) => void;
  isConnected: boolean;
  onConnect: () => void;
}

export default function MarketCard({
  market,
  currencySymbol,
  formatCurrency,
  onBet,
  isConnected,
  onConnect,
}: MarketCardProps) {
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [showBetInput, setShowBetInput] = useState(false);
  
  const prices = useMarketPrices(market.id);

  // Calculate time remaining
  const now = Date.now() / 1000;
  const timeRemaining = market.endTime - now;
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / 86400));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % 86400) / 3600));

  // Calculate implied probabilities (mock for now since no orders yet)
  const yesPrice = prices.bestYesAsk || 0.5;
  const noPrice = prices.bestNoAsk || 0.5;
  const yesProbability = Math.round(yesPrice * 100);
  const noProbability = Math.round(noPrice * 100);

  const handleSideSelect = (side: 'yes' | 'no') => {
    if (!isConnected) {
      onConnect();
      return;
    }
    setSelectedSide(side);
    setShowBetInput(true);
  };

  const handlePlaceBet = () => {
    if (selectedSide && betAmount > 0) {
      onBet(market.id, selectedSide === 'yes', betAmount);
      setShowBetInput(false);
      setSelectedSide(null);
    }
  };

  const presetAmounts = [5, 10, 25, 50, 100];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">
            {market.isRainMarket ? '🌧️' : '🌡️'}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            market.resolved 
              ? 'bg-gray-100 text-gray-600' 
              : 'bg-green-100 text-green-700'
          }`}>
            {market.resolved ? 'Resolved' : 'Active'}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{market.cityName}</h3>
        <p className="text-sm text-gray-500 mt-1">
          {market.isRainMarket 
            ? `Will rainfall exceed ${market.historicalAvg}mm?` 
            : `Will temperature exceed ${market.historicalAvg / 10}°C?`}
        </p>
      </div>

      {/* Market Stats */}
      <div className="px-4 py-3 bg-gray-50 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Historical Avg</span>
          <p className="font-medium">
            {market.isRainMarket 
              ? `${market.historicalAvg}mm` 
              : `${market.historicalAvg / 10}°C`}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Time Left</span>
          <p className="font-medium">
            {daysRemaining > 0 
              ? `${daysRemaining}d ${hoursRemaining}h` 
              : `${hoursRemaining}h`}
          </p>
        </div>
      </div>

      {/* YES/NO Buttons */}
      {!market.resolved && (
        <div className="p-4">
          {!showBetInput ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSideSelect('yes')}
                className="flex flex-col items-center p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-colors"
              >
                <span className="text-2xl mb-1">👍</span>
                <span className="font-bold text-green-700">YES</span>
                <span className="text-xs text-green-600 mt-1">
                  {yesProbability > 0 ? `${yesProbability}%` : '50%'}
                </span>
              </button>
              
              <button
                onClick={() => handleSideSelect('no')}
                className="flex flex-col items-center p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-colors"
              >
                <span className="text-2xl mb-1">👎</span>
                <span className="font-bold text-red-700">NO</span>
                <span className="text-xs text-red-600 mt-1">
                  {noProbability > 0 ? `${noProbability}%` : '50%'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Side */}
              <div className={`p-3 rounded-lg ${
                selectedSide === 'yes' 
                  ? 'bg-green-100 border border-green-300' 
                  : 'bg-red-100 border border-red-300'
              }`}>
                <p className="font-medium text-center">
                  Betting {selectedSide === 'yes' ? '👍 YES' : '👎 NO'}
                </p>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Amount</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        betAmount === amount
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {currencySymbol}{amount}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="1"
                />
              </div>

              {/* Potential Payout */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Your bet</span>
                  <span className="font-medium">{formatCurrency(betAmount)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Potential payout</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(betAmount * 2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowBetInput(false);
                    setSelectedSide(null);
                  }}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceBet}
                  className={`py-2 px-4 rounded-lg text-white transition-colors ${
                    selectedSide === 'yes'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Place Bet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolved Market Result */}
      {market.resolved && (
        <div className="p-4">
          <div className={`p-4 rounded-lg text-center ${
            market.outcome 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <p className="font-bold text-lg">
              {market.outcome ? '👍 YES Won!' : '👎 NO Won!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
