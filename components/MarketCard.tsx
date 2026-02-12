'use client';

import { useState, useEffect, useMemo } from 'react';
import { Market, useMarketOdds } from '../hooks/useOrderBook';
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
    userBets,
    placeBet,
    getTestTokens,
    status,
    error,
    reset,
    refreshUserBets,
  } = useBetting();

  const { odds, refetchOdds } = useMarketOdds(market.id);

  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [betAmount, setBetAmount] = useState<number>(5);
  const [showBetPanel, setShowBetPanel] = useState(false);

  // Refresh user bets when connected
  useEffect(() => {
    if (isConnected) {
      refreshUserBets([market.id]);
    }
  }, [isConnected, market.id, refreshUserBets]);

  // User's bet in this market
  const userBet = userBets.find(b => b.marketId === market.id);
  const hasBet = userBet && (parseFloat(userBet.yesAmount) > 0 || parseFloat(userBet.noAmount) > 0);

  // Time remaining
  const now = Date.now() / 1000;
  const timeRemaining = market.endTime - now;
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / 86400));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % 86400) / 3600));

  // Pool volume in USDm
  const yesPoolUsd = Number(market.yesPool) / 1e6;
  const noPoolUsd = Number(market.noPool) / 1e6;
  const totalVolume = yesPoolUsd + noPoolUsd;

  // Smart odds display
  // When one side is empty, show projected odds for a hypothetical $5 bet
  // This encourages the first bettor on the empty side
  const displayOdds = useMemo(() => {
    const HYPOTHETICAL_BET = 5; // $5 USDm

    if (totalVolume === 0) {
      // No bets at all — show 50/50 with 2x
      return {
        yesPct: 50,
        noPct: 50,
        yesMultiplier: 2.0,
        noMultiplier: 2.0,
        isProjected: false,
      };
    }

    if (noPoolUsd === 0) {
      // Only YES bets exist — project what NO would look like
      const projectedTotal = totalVolume + HYPOTHETICAL_BET;
      const noMultiplier = projectedTotal / HYPOTHETICAL_BET;
      // Show at least 5% for NO to indicate it's still possible
      const yesPct = Math.min(95, Math.round((yesPoolUsd / projectedTotal) * 100));
      return {
        yesPct,
        noPct: 100 - yesPct,
        yesMultiplier: projectedTotal / yesPoolUsd,
        noMultiplier,
        isProjected: true,
      };
    }

    if (yesPoolUsd === 0) {
      // Only NO bets exist — project what YES would look like
      const projectedTotal = totalVolume + HYPOTHETICAL_BET;
      const yesMultiplier = projectedTotal / HYPOTHETICAL_BET;
      const noPct = Math.min(95, Math.round((noPoolUsd / projectedTotal) * 100));
      return {
        yesPct: 100 - noPct,
        noPct,
        yesMultiplier,
        noMultiplier: projectedTotal / noPoolUsd,
        isProjected: true,
      };
    }

    // Both sides have bets — use real odds from contract
    return {
      yesPct: odds.yesPct,
      noPct: odds.noPct,
      yesMultiplier: odds.yesMultiplier,
      noMultiplier: odds.noMultiplier,
      isProjected: false,
    };
  }, [totalVolume, yesPoolUsd, noPoolUsd, odds]);

  // Balance
  const walletBalance = parseFloat(balances.wallet);
  const needsFunds = walletBalance < 1;

  // Potential win — calculate including how our bet shifts the pool
  const selectedMultiplier = selectedSide === 'yes' ? displayOdds.yesMultiplier : displayOdds.noMultiplier;
  const potentialWinEstimate = useMemo(() => {
    if (!selectedSide || betAmount <= 0) return 0;

    // More accurate: calculate what our bet WOULD return
    // newTotal = totalVolume + betAmount
    // our share of winning pool = betAmount / (ourSidePool + betAmount)
    // payout = share × newTotal
    const ourSidePool = selectedSide === 'yes' ? yesPoolUsd : noPoolUsd;
    const newTotal = totalVolume + betAmount;
    const newSidePool = ourSidePool + betAmount;
    const payout = (betAmount / newSidePool) * newTotal;
    const profit = payout - betAmount;
    const fee = profit * 0.005; // 0.5% fee on profit
    return payout - fee;
  }, [selectedSide, betAmount, totalVolume, yesPoolUsd, noPoolUsd]);

  const isProcessing = status === 'preparing' || status === 'approving' || status === 'confirming';
  const presetAmounts = [1, 5, 10, 25, 50];

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
      refetchOdds();
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

  // Format display helper — uses local currency via formatCurrency prop
  const fmtLocal = (usdAmount: number) => {
    return formatCurrency(usdAmount);
  };

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
              : market.cancelled
              ? 'bg-red-800 text-red-300'
              : 'bg-yellow-400 text-gray-900'
          }`}>
            {market.resolved ? t('market.resolved') : market.cancelled ? 'Cancelled' : t('market.active')}
          </span>
        </div>
      </div>

      {/* User Bets */}
      {hasBet && (
        <div className="bg-blue-900/30 border-b border-blue-700 p-4">
          <p className="text-blue-300 text-sm font-medium mb-2">📊 Your Bets</p>
          <div className="flex gap-4">
            {parseFloat(userBet!.yesAmount) > 0 && (
              <div className="bg-green-900/50 px-3 py-2 rounded-lg">
                <span className="text-green-400 font-bold">
                  👍 {fmtLocal(parseFloat(userBet!.yesAmount))} on YES
                </span>
              </div>
            )}
            {parseFloat(userBet!.noAmount) > 0 && (
              <div className="bg-red-900/50 px-3 py-2 rounded-lg">
                <span className="text-red-400 font-bold">
                  👎 {fmtLocal(parseFloat(userBet!.noAmount))} on NO
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
          <p className="text-gray-400 text-xs">Pool</p>
          <p className="text-lg font-bold text-white">
            {fmtLocal(totalVolume)}
          </p>
        </div>
      </div>

      {/* Balance Display */}
      {isConnected && !showBetPanel && (
        <div className="bg-gray-800/50 p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">💰 Your Balance</span>
            <span className="text-white font-bold">
              {fmtLocal(walletBalance)}
            </span>
          </div>
          {needsFunds && (
            <button
              onClick={handleGetTokens}
              disabled={isProcessing}
              className="w-full mt-3 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? '⏳ Getting tokens...' :
               status === 'success' ? '✅ Tokens received!' :
               '🎁 Get Free Test Tokens'}
            </button>
          )}
          {!needsFunds && balances.canClaimFaucet && walletBalance < 50 && (
            <button
              onClick={handleGetTokens}
              disabled={isProcessing}
              className="w-full mt-2 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isProcessing ? '⏳...' : '+ Get more test tokens'}
            </button>
          )}
          {!showBetPanel && status === 'error' && error && (
            <div className="mt-2 p-2 bg-red-900/50 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          {!showBetPanel && status === 'success' && (
            <div className="mt-2 p-2 bg-green-900/50 rounded-lg text-green-400 text-sm text-center">
              ✅ Tokens received!
            </div>
          )}
        </div>
      )}

      {/* YES / NO Buttons */}
      {!market.resolved && !market.cancelled && !showBetPanel && (
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleSideSelect('yes')} className="group">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 transform transition-all duration-200 group-hover:scale-105 group-active:scale-95">
                <div className="text-center">
                  <span className="text-5xl mb-2 block">👍</span>
                  <span className="text-3xl font-black text-white block">{t('bet.yes')}</span>
                  <span className="text-green-100 text-sm mt-2 block">{t('bet.yesWins')}</span>
                  <div className="mt-3 bg-green-400/30 rounded-full px-4 py-1 inline-block">
                    <span className="text-white font-bold text-lg">{displayOdds.yesPct}%</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-green-200 text-xs">
                      {displayOdds.yesMultiplier >= 100
                        ? `pays ${displayOdds.yesMultiplier.toFixed(0)}x`
                        : `pays ${displayOdds.yesMultiplier.toFixed(2)}x`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </button>

            <button onClick={() => handleSideSelect('no')} className="group">
              <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 transform transition-all duration-200 group-hover:scale-105 group-active:scale-95">
                <div className="text-center">
                  <span className="text-5xl mb-2 block">👎</span>
                  <span className="text-3xl font-black text-white block">{t('bet.no')}</span>
                  <span className="text-red-100 text-sm mt-2 block">{t('bet.noWins')}</span>
                  <div className="mt-3 bg-red-400/30 rounded-full px-4 py-1 inline-block">
                    <span className="text-white font-bold text-lg">{displayOdds.noPct}%</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-red-200 text-xs">
                      {displayOdds.noMultiplier >= 100
                        ? `pays ${displayOdds.noMultiplier.toFixed(0)}x`
                        : `pays ${displayOdds.noMultiplier.toFixed(2)}x`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Projected odds hint */}
          {displayOdds.isProjected && totalVolume > 0 && (
            <p className="text-center text-gray-500 mt-3 text-xs">
              * Projected odds based on current pool of {fmtLocal(totalVolume)}
            </p>
          )}

          {!isConnected && (
            <p className="text-center text-gray-400 mt-4 text-sm">
              {t('bet.connectFirst')}
            </p>
          )}
        </div>
      )}

      {/* Bet Panel */}
      {!market.resolved && !market.cancelled && showBetPanel && (
        <div className="p-5 space-y-5">
          {/* Selected side banner */}
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
          </div>

          {/* Available balance */}
          <div className="flex justify-between items-center bg-gray-800 rounded-xl p-3">
            <span className="text-gray-400 text-sm">Available</span>
            <span className="text-white font-bold">{fmtLocal(walletBalance)}</span>
          </div>

          {/* Amount selection — shows local currency */}
          <div>
            <label className="block text-gray-300 text-lg mb-3 font-medium">
              {t('bet.amount')}
            </label>
            <div className="grid grid-cols-5 gap-2 mb-4">
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
                  {fmtLocal(amount)}
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
              placeholder={`Amount in ${currencySymbol}`}
            />
            <p className="text-gray-500 text-xs mt-2 text-center">
              ≈ {betAmount} USDm
            </p>
          </div>

          {/* Bet summary */}
          <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-400">{t('bet.yourBet')}</span>
              <span className="text-white font-bold">{fmtLocal(betAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-400">{t('bet.potentialWin')}</span>
              <span className="text-yellow-400 font-bold text-2xl">
                {fmtLocal(potentialWinEstimate)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Net profit</span>
              <span className="text-green-400 font-medium">
                +{fmtLocal(Math.max(0, potentialWinEstimate - betAmount))}
              </span>
            </div>
          </div>

          {/* Not enough funds */}
          {walletBalance < betAmount && (
            <div className="p-3 bg-yellow-900/50 rounded-xl text-yellow-400 text-center">
              <p className="font-medium">Not enough funds ({fmtLocal(walletBalance)} available)</p>
              <button
                onClick={handleGetTokens}
                disabled={isProcessing}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                🎁 Get free test tokens
              </button>
            </div>
          )}

          {/* Status messages */}
          {status !== 'idle' && (
            <div className={`p-4 rounded-xl text-center font-medium ${
              status === 'success'
                ? 'bg-green-900/50 text-green-400'
                : status === 'error'
                ? 'bg-red-900/50 text-red-400'
                : 'bg-blue-900/50 text-blue-400'
            }`}>
              {status === 'preparing' && '⏳ Preparing...'}
              {status === 'approving' && '✍️ Approve token (one-time only)...'}
              {status === 'confirming' && '✍️ Placing your bet...'}
              {status === 'success' && '✅ Bet placed!'}
              {status === 'error' && `❌ ${error}`}
            </div>
          )}

          {/* Action buttons */}
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
              disabled={isProcessing || status === 'success' || walletBalance < betAmount}
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
