'use client';

import { useState, useEffect } from 'react';
import { Market, useMarketPrices } from '../hooks/useOrderBook';
import { useBetting } from '../hooks/useBetting';
import { useTranslation } from '../hooks/useTranslation';

interface MarketCardProps {
  market: Market;
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
  onConnect: () => void;
}

export default function MarketCard({
  market,
  currencySymbol,
  formatCurrency,
  onConnect,
}: MarketCardProps) {
  const { t } = useTranslation();
  const { 
    isConnected, 
    balances, 
    positions,
    placeBet, 
    getTestTokens,
    status, 
    error, 
    reset,
    refreshPositions,
    refreshBalances,
  } = useBetting();
  
  const prices = useMarketPrices(market.id);
  
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [showBetPanel, setShowBetPanel] = useState(false);

  // Refresh positions when connected
  useEffect(() => {
    if (isConnected) {
      refreshPositions([market.id]);
    }
  }, [isConnected, market.id, refreshPositions]);

  // Get user's position in this market
  const userPosition = positions.find(p => p.marketId === market.id);
  const hasPosition = userPosition && (parseFloat(userPosition.yesShares) > 0 || parseFloat(userPosition.noShares) > 0);

  // Calculate time remaining
  const now = Date.now() / 1000;
  const timeRemaining = market.endTime - now;
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / 86400));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % 86400) / 3600));

  // Calculate odds from actual betting volume (not empty order book)
  const totalYes = Number(market.totalYesShares);
  const totalNo = Number(market.totalNoShares);
  const totalVolume = totalYes + totalNo;
  // More YES bets → YES costs more (lower payout) → higher YES probability displayed
  const yesProbability = totalVolume > 0 
    ? Math.round((totalYes / totalVolume) * 100)
    : 50;
  const noProbability = 100 - yesProbability;

  // Calculate payout multiplier based on odds
  const yesMultiplier = yesProbability > 0 ? (100 / yesProbability) : 2;
  const noMultiplier = noProbability > 0 ? (100 / noProbability) : 2;

  // Show total available funds (wallet + deposited)
  const totalBalance = parseFloat(balances.total);
  const needsFunds = totalBalance < 5;

  const handleSideSelect = (side: 'yes' | 'no') => {
    if (!isConnected) {
      onConnect();
      return;
    }
    setSelectedSide(side);
    setShowBetPanel(true);
    reset();
  };

  const handlePlaceBet = async () => {
    if (!selectedSide || betAmount <= 0) return;
    
    const success = await placeBet(market.id, selectedSide === 'yes', betAmount);
    
    if (success) {
      setTimeout(() => {
        setShowBetPanel(false);
        setSelectedSide(null);
        reset();
      }, 2000);
    }
  };

  const handleGetTokens = async () => {
    const success = await getTestTokens();
    if (success) {
      setTimeout(() => reset(), 3000);
    }
  };

  const handleCancel = () => {
    setShowBetPanel(false);
    setSelectedSide(null);
    reset();
  };

  const presetAmounts = [5, 10, 25, 50];
  const isProcessing = status === 'preparing' || status === 'approving' || status === 'depositing' || status === 'confirming';

  // Calculate potential win based on selected side's multiplier
  const selectedMultiplier = selectedSide === 'yes' ? yesMultiplier : noMultiplier;
  const potentialWin = betAmount * selectedMultiplier;

  return (
    <div className="bg-gray-900 rounded-3xl overflow-hidden border-2 border-gray-700 shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">
              {market.isRainMarket ? '🌧️' : '🌡️'}
            </span>
            <div>
              <h3 className="text-2xl font-bold text-white">{market.cityName}</h3>
              <p className="text-emerald-100 text-sm">
                {market.isRainMarket ? t('market.rain') : t('market.temperature')}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold ${
            market.resolved 
              ? 'bg-gray-800 text-gray-300' 
              : 'bg-yellow-400 text-gray-900'
          }`}>
            {market.resolved ? t('market.resolved') : t('market.active')}
          </span>
        </div>
      </div>

      {/* User Position (if any) */}
      {hasPosition && (
        <div className="bg-blue-900/30 border-b border-blue-700 p-4">
          <p className="text-blue-300 text-sm font-medium mb-2">📊 Your Position</p>
          <div className="flex gap-4">
            {parseFloat(userPosition!.yesShares) > 0 && (
              <div className="bg-green-900/50 px-3 py-2 rounded-lg">
                <span className="text-green-400 font-bold">
                  👍 {parseFloat(userPosition!.yesShares).toFixed(2)} YES
                </span>
              </div>
            )}
            {parseFloat(userPosition!.noShares) > 0 && (
              <div className="bg-red-900/50 px-3 py-2 rounded-lg">
                <span className="text-red-400 font-bold">
                  👎 {parseFloat(userPosition!.noShares).toFixed(2)} NO
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="p-5 border-b border-gray-700">
        <p className="text-xl text-white text-center font-medium">
          {t('market.willExceed')}{' '}
          <span className="text-3xl font-bold text-yellow-400">
            {market.isRainMarket 
              ? `${market.historicalAvg}mm` 
              : `${market.historicalAvg / 10}°C`}
          </span>
          ?
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-700 bg-gray-800">
        <div className="p-4 text-center">
          <p className="text-gray-400 text-xs">{t('market.historical')}</p>
          <p className="text-lg font-bold text-white">
            {market.isRainMarket 
              ? `${market.historicalAvg}mm` 
              : `${market.historicalAvg / 10}°C`}
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="text-gray-400 text-xs">{t('market.timeLeft')}</p>
          <p className="text-lg font-bold text-white">
            {daysRemaining > 0 
              ? `${daysRemaining} ${t('market.days')}` 
              : `${hoursRemaining} ${t('market.hours')}`}
          </p>
        </div>
        <div className="p-4 text-center">
          <p className="text-gray-400 text-xs">Volume</p>
          <p className="text-lg font-bold text-white">
            {totalVolume > 0 
              ? `$${(totalVolume / 1e6).toFixed(0)}` 
              : '$0'}
          </p>
        </div>
      </div>

      {/* Balance Display (when connected) */}
      {isConnected && !showBetPanel && (
        <div className="bg-gray-800/50 p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">💰 Your Balance</span>
            <span className="text-white font-bold">
              ${parseFloat(balances.total).toFixed(2)} USDm
            </span>
          </div>
          {needsFunds && (
            <button
              onClick={handleGetTokens}
              disabled={isProcessing}
              className="w-full mt-3 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? '⏳ Getting tokens...' : 
               status === 'success' ? '✅ 100 USDm received!' :
               '🎁 Get Free Test Tokens (100 USDm)'}
            </button>
          )}
          {!needsFunds && balances.canClaimFaucet && totalBalance < 50 && (
            <button
              onClick={handleGetTokens}
              disabled={isProcessing}
              className="w-full mt-2 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isProcessing ? '⏳ Getting tokens...' : '+ Get more test tokens'}
            </button>
          )}
          {!showBetPanel && status === 'error' && error && (
            <div className="mt-2 p-2 bg-red-900/50 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          {!showBetPanel && status === 'success' && (
            <div className="mt-2 p-2 bg-green-900/50 rounded-lg text-green-400 text-sm text-center">
              ✅ Tokens received! You can now place bets.
            </div>
          )}
        </div>
      )}

      {/* YES/NO Buttons */}
      {!market.resolved && !showBetPanel && (
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSideSelect('yes')}
              className="group"
            >
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 transform transition-all duration-200 group-hover:scale-105 group-active:scale-95">
                <div className="text-center">
                  <span className="text-5xl mb-2 block">👍</span>
                  <span className="text-3xl font-black text-white block">{t('bet.yes')}</span>
                  <span className="text-green-100 text-sm mt-2 block">{t('bet.yesWins')}</span>
                  <div className="mt-3 bg-green-400/30 rounded-full px-4 py-1 inline-block">
                    <span className="text-white font-bold text-lg">{yesProbability}%</span>
                  </div>
                  {totalVolume > 0 && (
                    <div className="mt-1">
                      <span className="text-green-200 text-xs">pays {yesMultiplier.toFixed(2)}x</span>
                    </div>
                  )}
                </div>
              </div>
            </button>

            <button
              onClick={() => handleSideSelect('no')}
              className="group"
            >
              <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 transform transition-all duration-200 group-hover:scale-105 group-active:scale-95">
                <div className="text-center">
                  <span className="text-5xl mb-2 block">👎</span>
                  <span className="text-3xl font-black text-white block">{t('bet.no')}</span>
                  <span className="text-red-100 text-sm mt-2 block">{t('bet.noWins')}</span>
                  <div className="mt-3 bg-red-400/30 rounded-full px-4 py-1 inline-block">
                    <span className="text-white font-bold text-lg">{noProbability}%</span>
                  </div>
                  {totalVolume > 0 && (
                    <div className="mt-1">
                      <span className="text-red-200 text-xs">pays {noMultiplier.toFixed(2)}x</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-gray-400 mt-4 text-sm">
              {t('bet.connectFirst')}
            </p>
          )}
        </div>
      )}

      {/* Bet Panel */}
      {!market.resolved && showBetPanel && (
        <div className="p-5 space-y-5">
          <div className={`p-4 rounded-2xl text-center ${
            selectedSide === 'yes' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
              : 'bg-gradient-to-r from-red-600 to-rose-600'
          }`}>
            <span className="text-3xl mr-2">
              {selectedSide === 'yes' ? '👍' : '👎'}
            </span>
            <span className="text-2xl font-bold text-white">
              {selectedSide === 'yes' ? t('bet.yes') : t('bet.no')}
            </span>
            <span className="text-white/70 text-sm ml-2">
              ({selectedSide === 'yes' ? yesProbability : noProbability}% odds • {selectedMultiplier.toFixed(2)}x payout)
            </span>
          </div>

          {/* Show balance in bet panel */}
          <div className="flex justify-between items-center bg-gray-800 rounded-xl p-3">
            <span className="text-gray-400 text-sm">Available</span>
            <span className="text-white font-bold">${parseFloat(balances.total).toFixed(2)} USDm</span>
          </div>

          <div>
            <label className="block text-gray-300 text-lg mb-3 font-medium">
              {t('bet.amount')}
            </label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={isProcessing}
                  className={`py-3 px-2 rounded-xl text-lg font-bold transition-all ${
                    betAmount === amount
                      ? 'bg-yellow-400 text-gray-900 scale-105'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  } ${isProcessing ? 'opacity-50' : ''}`}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              disabled={isProcessing}
              className="w-full px-4 py-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white text-xl text-center font-bold focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:opacity-50"
              min="1"
            />
          </div>

          <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-400">{t('bet.yourBet')}</span>
              <span className="text-white font-bold">${betAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-400">{t('bet.potentialWin')}</span>
              <span className="text-yellow-400 font-bold text-2xl">
                ${potentialWin.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Not enough funds warning */}
          {totalBalance < betAmount && (
            <div className="p-3 bg-yellow-900/50 rounded-xl text-yellow-400 text-center">
              <p className="font-medium">Not enough funds (${totalBalance.toFixed(2)} available)</p>
              <button
                onClick={handleGetTokens}
                disabled={isProcessing}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                🎁 Get 100 USDm free
              </button>
            </div>
          )}

          {/* Status Messages */}
          {status !== 'idle' && (
            <div className={`p-4 rounded-xl text-center font-medium ${
              status === 'success' 
                ? 'bg-green-900/50 text-green-400' 
                : status === 'error'
                ? 'bg-red-900/50 text-red-400'
                : 'bg-blue-900/50 text-blue-400'
            }`}>
              {status === 'preparing' && '⏳ Preparing...'}
              {status === 'approving' && '✍️ Step 1/3: Approve token (one-time only)...'}
              {status === 'depositing' && '✍️ Step 2/3: Depositing funds...'}
              {status === 'confirming' && '✍️ Final step: Placing your bet...'}
              {status === 'success' && '✅ Bet placed!'}
              {status === 'error' && `❌ ${error}`}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="py-4 px-6 bg-gray-700 rounded-xl text-white text-lg font-bold hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {t('bet.cancel')}
            </button>
            <button
              onClick={handlePlaceBet}
              disabled={isProcessing || status === 'success' || totalBalance < betAmount}
              className={`py-4 px-6 rounded-xl text-lg font-bold transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none ${
                selectedSide === 'yes'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
              }`}
            >
              {isProcessing ? '⏳' : t('bet.placeBet')}
            </button>
          </div>
        </div>
      )}

      {/* Resolved */}
      {market.resolved && (
        <div className="p-5">
          <div className={`p-6 rounded-2xl text-center ${
            market.outcome 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
              : 'bg-gradient-to-r from-red-600 to-rose-600'
          }`}>
            <span className="text-5xl mb-2 block">
              {market.outcome ? '👍' : '👎'}
            </span>
            <p className="text-2xl font-bold text-white">
              {market.outcome ? t('bet.yes') : t('bet.no')} Won!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
