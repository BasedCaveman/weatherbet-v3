'use client';
import { ethers } from 'ethers';
import { useState, useEffect, useMemo } from 'react';
import { Market, useMarketOdds } from '../hooks/useOrderBook';
import { useBetting } from '../hooks/useBetting';
import { useTranslation } from '../hooks/useTranslation';

interface MarketCardProps {
  market: Market;
  formatLocal: (usdmAmount: number) => string;
  onConnect: () => void;
}

export default function MarketCard({ market, formatLocal, onConnect }: MarketCardProps) {
  const { t } = useTranslation();
  const {
    isConnected, balances, userBets, placeBet, getTestTokens, status, error, reset, refreshUserBets,
  } = useBetting();
  const { odds, refetchOdds } = useMarketOdds(market.id);

  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [betAmount, setBetAmount] = useState<number>(5);
  const [showBetPanel, setShowBetPanel] = useState(false);

  useEffect(() => {
    if (isConnected) refreshUserBets([market.id]);
  }, [isConnected, market.id, refreshUserBets]);

  const userBet = userBets.find(b => b.marketId === market.id);
  const hasBet = userBet && (parseFloat(userBet.yesAmount) > 0 || parseFloat(userBet.noAmount) > 0);

  const now = Date.now() / 1000;
  const timeRemaining = market.endTime - now;
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / 86400));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % 86400) / 3600));

  const yesPoolNum = Number(ethers.formatUnits(market.yesPool, 18));
  const noPoolNum = Number(ethers.formatUnits(market.noPool, 18));
  const totalVolume = yesPoolNum + noPoolNum;

  // Smart projected odds
  const displayOdds = useMemo(() => {
    const H = 5;
    if (totalVolume === 0) return { yesPct: 50, noPct: 50, yesMultiplier: 2, noMultiplier: 2, isProjected: false };
    if (noPoolUsd === 0) {
      const t = totalVolume + H;
      return { yesPct: Math.min(95, Math.round((yesPoolUsd / t) * 100)), noPct: Math.max(5, 100 - Math.min(95, Math.round((yesPoolUsd / t) * 100))), yesMultiplier: t / yesPoolUsd, noMultiplier: t / H, isProjected: true };
    }
    if (yesPoolUsd === 0) {
      const t = totalVolume + H;
      return { noPct: Math.min(95, Math.round((noPoolUsd / t) * 100)), yesPct: Math.max(5, 100 - Math.min(95, Math.round((noPoolUsd / t) * 100))), yesMultiplier: t / H, noMultiplier: t / noPoolUsd, isProjected: true };
    }
    return { yesPct: odds.yesPct, noPct: odds.noPct, yesMultiplier: odds.yesMultiplier, noMultiplier: odds.noMultiplier, isProjected: false };
  }, [totalVolume, yesPoolUsd, noPoolUsd, odds]);

  const walletBalance = parseFloat(balances.wallet);
  const needsFunds = walletBalance < 1;

  // Accurate potential win
  const potentialWinEstimate = useMemo(() => {
    if (!selectedSide || betAmount <= 0) return 0;
    const ourSidePool = selectedSide === 'yes' ? yesPoolUsd : noPoolUsd;
    const newTotal = totalVolume + betAmount;
    const newSidePool = ourSidePool + betAmount;
    const payout = (betAmount / newSidePool) * newTotal;
    const profit = payout - betAmount;
    const fee = profit > 0 ? profit * 0.005 : 0;
    return payout - fee;
  }, [selectedSide, betAmount, totalVolume, yesPoolUsd, noPoolUsd]);

  const isProcessing = status === 'preparing' || status === 'approving' || status === 'confirming';
  const presetAmounts = [1, 5, 10, 25, 50];

  const handleSideSelect = (side: 'yes' | 'no') => {
    if (!isConnected) { onConnect(); return; }
    setSelectedSide(side); setShowBetPanel(true); reset();
  };

  const handlePlaceBet = async () => {
    if (!selectedSide || betAmount <= 0) return;
    const success = await placeBet(market.id, selectedSide === 'yes', betAmount);
    if (success) { refetchOdds(); setTimeout(() => { setShowBetPanel(false); setSelectedSide(null); reset(); }, 2000); }
  };

  const handleGetTokens = async () => {
    const success = await getTestTokens();
    if (success) setTimeout(() => reset(), 3000);
  };

  const handleCancel = () => { setShowBetPanel(false); setSelectedSide(null); reset(); };

  const fmtMult = (m: number) => m >= 100 ? `${m.toFixed(0)}x` : `${m.toFixed(2)}x`;

  const thresholdDisplay = market.isRainMarket
    ? `${market.historicalAvg}mm`
    : `${market.historicalAvg / 10}°C`;

  return (
    <div className="bg-gray-900 rounded-3xl overflow-hidden border-2 border-gray-700 shadow-2xl">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-3xl flex-shrink-0">{market.isRainMarket ? '🌧️' : '🌡️'}</span>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-white truncate">{market.cityName}</h3>
              <p className="text-emerald-100 text-xs truncate">
                {market.isRainMarket ? t('market.rain') : t('market.temperature')}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 ${
            market.resolved ? 'bg-gray-800 text-gray-300'
            : market.cancelled ? 'bg-red-800 text-red-300'
            : 'bg-yellow-400 text-gray-900'
          }`}>
            {market.resolved ? t('market.resolved') : market.cancelled ? 'Cancelled' : t('market.active')}
          </span>
        </div>
      </div>

      {/* User Bets */}
      {hasBet && (
        <div className="bg-blue-900/30 border-b border-blue-700 px-4 py-3">
          <p className="text-blue-300 text-xs font-medium mb-1.5">📊 {t('bet.yourBet')}</p>
          <div className="flex gap-3 flex-wrap">
            {parseFloat(userBet!.yesAmount) > 0 && (
              <div className="bg-green-900/50 px-2.5 py-1.5 rounded-lg">
                <span className="text-green-400 font-bold text-sm">
                  👍 {formatLocal(parseFloat(userBet!.yesAmount))} {t('bet.yes')}
                </span>
              </div>
            )}
            {parseFloat(userBet!.noAmount) > 0 && (
              <div className="bg-red-900/50 px-2.5 py-1.5 rounded-lg">
                <span className="text-red-400 font-bold text-sm">
                  👎 {formatLocal(parseFloat(userBet!.noAmount))} {t('bet.no')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="p-4 border-b border-gray-700">
        <p className="text-lg text-white text-center font-medium leading-tight">
          {t('market.willExceed')}{' '}
          <span className="text-2xl font-bold text-yellow-400">{thresholdDisplay}</span>?
        </p>
      </div>

      {/* Stats — responsive grid with min-width per cell */}
      <div className="grid grid-cols-3 divide-x divide-gray-700 bg-gray-800">
        <div className="p-3 text-center min-w-0">
          <p className="text-gray-400 text-[10px] truncate">{t('market.historical')}</p>
          <p className="text-base font-bold text-white truncate">{thresholdDisplay}</p>
        </div>
        <div className="p-3 text-center min-w-0">
          <p className="text-gray-400 text-[10px] truncate">{t('market.timeLeft')}</p>
          <p className="text-base font-bold text-white truncate">
            {daysRemaining > 0 ? `${daysRemaining} ${t('market.days')}` : `${hoursRemaining} ${t('market.hours')}`}
          </p>
        </div>
        <div className="p-3 text-center min-w-0">
          <p className="text-gray-400 text-[10px] truncate">Pool</p>
          <p className="text-base font-bold text-white truncate">{formatLocal(totalVolume)}</p>
        </div>
      </div>

      {/* Balance */}
      {isConnected && !showBetPanel && (
        <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">💰 {t('bet.balance')}</span>
            <span className="text-white font-bold text-sm">{formatLocal(walletBalance)}</span>
          </div>
          {needsFunds && (
            <button onClick={handleGetTokens} disabled={isProcessing}
              className="w-full mt-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              {isProcessing ? '⏳...' : status === 'success' ? '✅' : `🎁 ${t('bet.needFunds')}`}
            </button>
          )}
          {!needsFunds && balances.canClaimFaucet && walletBalance < 50 && (
            <button onClick={handleGetTokens} disabled={isProcessing}
              className="w-full mt-1.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium text-xs transition-colors disabled:opacity-50">
              {isProcessing ? '⏳...' : '+ Get more test tokens'}
            </button>
          )}
          {!showBetPanel && status === 'error' && error && (
            <div className="mt-2 p-2 bg-red-900/50 rounded-lg text-red-400 text-xs text-center">{error}</div>
          )}
          {!showBetPanel && status === 'success' && (
            <div className="mt-2 p-2 bg-green-900/50 rounded-lg text-green-400 text-xs text-center">✅</div>
          )}
        </div>
      )}

      {/* YES / NO Buttons */}
      {!market.resolved && !market.cancelled && !showBetPanel && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* YES */}
            <button onClick={() => handleSideSelect('yes')} className="group">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 transform transition-all duration-200 group-hover:scale-[1.03] group-active:scale-95">
                <div className="text-center">
                  <span className="text-4xl mb-1 block">👍</span>
                  <span className="text-2xl font-black text-white block">{t('bet.yes')}</span>
                  <span className="text-green-100 text-xs mt-1 block truncate">{t('bet.yesWins')}</span>
                  <div className="mt-2 bg-green-400/30 rounded-full px-3 py-0.5 inline-block">
                    <span className="text-white font-bold">{displayOdds.yesPct}%</span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-green-200 text-[11px]">{fmtMult(displayOdds.yesMultiplier)}</span>
                  </div>
                </div>
              </div>
            </button>

            {/* NO */}
            <button onClick={() => handleSideSelect('no')} className="group">
              <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 transform transition-all duration-200 group-hover:scale-[1.03] group-active:scale-95">
                <div className="text-center">
                  <span className="text-4xl mb-1 block">👎</span>
                  <span className="text-2xl font-black text-white block">{t('bet.no')}</span>
                  <span className="text-red-100 text-xs mt-1 block truncate">{t('bet.noWins')}</span>
                  <div className="mt-2 bg-red-400/30 rounded-full px-3 py-0.5 inline-block">
                    <span className="text-white font-bold">{displayOdds.noPct}%</span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-red-200 text-[11px]">{fmtMult(displayOdds.noMultiplier)}</span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {displayOdds.isProjected && totalVolume > 0 && (
            <p className="text-center text-gray-500 mt-2 text-[10px]">* Projected for {formatLocal(5)} bet</p>
          )}
          {!isConnected && (
            <p className="text-center text-gray-400 mt-3 text-sm">{t('bet.connectFirst')}</p>
          )}
        </div>
      )}

      {/* Bet Panel */}
      {!market.resolved && !market.cancelled && showBetPanel && (
        <div className="p-4 space-y-4">
          {/* Side banner */}
          <div className={`p-3 rounded-2xl text-center ${
            selectedSide === 'yes' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-rose-600'
          }`}>
            <span className="text-2xl mr-1">{selectedSide === 'yes' ? '👍' : '👎'}</span>
            <span className="text-xl font-bold text-white">
              {selectedSide === 'yes' ? t('bet.yes') : t('bet.no')}
            </span>
          </div>

          {/* Available */}
          <div className="flex justify-between items-center bg-gray-800 rounded-xl px-3 py-2">
            <span className="text-gray-400 text-xs">{t('bet.available')}</span>
            <span className="text-white font-bold text-sm">{formatLocal(walletBalance)}</span>
          </div>

          {/* Amount presets — wraps gracefully */}
          <div>
            <label className="block text-gray-300 text-sm mb-2 font-medium">{t('bet.amount')}</label>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {presetAmounts.map((amount) => (
                <button key={amount} onClick={() => setBetAmount(amount)} disabled={isProcessing}
                  className={`flex-1 min-w-[52px] py-2.5 rounded-xl text-xs font-bold transition-all ${
                    betAmount === amount ? 'bg-yellow-400 text-gray-900 scale-105' : 'bg-gray-700 text-white hover:bg-gray-600'
                  } ${isProcessing ? 'opacity-50' : ''}`}>
                  {formatLocal(amount)}
                </button>
              ))}
            </div>
            <input type="number" value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))} disabled={isProcessing}
              className="w-full px-4 py-3 bg-gray-700 border-2 border-gray-600 rounded-xl text-white text-lg text-center font-bold focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:opacity-50"
              min="1" />
            <p className="text-gray-500 text-[10px] mt-1 text-center">≈ {betAmount} USDm</p>
          </div>

          {/* Summary */}
          <div className="bg-gray-800 rounded-2xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{t('bet.yourBet')}</span>
              <span className="text-white font-bold">{formatLocal(betAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{t('bet.potentialWin')}</span>
              <span className="text-yellow-400 font-bold text-xl">{formatLocal(potentialWinEstimate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">{t('bet.netProfit')}</span>
              <span className="text-green-400 font-medium text-sm">
                +{formatLocal(Math.max(0, potentialWinEstimate - betAmount))}
              </span>
            </div>
          </div>

          {/* Not enough funds */}
          {walletBalance < betAmount && (
            <div className="p-2.5 bg-yellow-900/50 rounded-xl text-yellow-400 text-center text-sm">
              <p className="font-medium">Not enough ({formatLocal(walletBalance)} available)</p>
              <button onClick={handleGetTokens} disabled={isProcessing}
                className="mt-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-xs transition-colors disabled:opacity-50">
                🎁 {t('bet.needFunds')}
              </button>
            </div>
          )}

          {/* Status */}
          {status !== 'idle' && (
            <div className={`p-3 rounded-xl text-center text-sm font-medium ${
              status === 'success' ? 'bg-green-900/50 text-green-400'
              : status === 'error' ? 'bg-red-900/50 text-red-400'
              : 'bg-blue-900/50 text-blue-400'
            }`}>
              {status === 'preparing' && `⏳ ${t('bet.connecting')}`}
              {status === 'approving' && `✍️ ${t('bet.approving')}`}
              {status === 'confirming' && `✍️ ${t('bet.placing')}`}
              {status === 'success' && `✅ ${t('bet.success')}`}
              {status === 'error' && `❌ ${error}`}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleCancel} disabled={isProcessing}
              className="py-3.5 bg-gray-700 rounded-xl text-white font-bold hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm truncate">
              {t('bet.cancel')}
            </button>
            <button onClick={handlePlaceBet}
              disabled={isProcessing || status === 'success' || walletBalance < betAmount}
              className={`py-3.5 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none text-sm truncate ${
                selectedSide === 'yes' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
              }`}>
              {isProcessing ? '⏳' : t('bet.placeBet')}
            </button>
          </div>
        </div>
      )}

      {/* Resolved */}
      {market.resolved && (
        <div className="p-4">
          <div className={`p-5 rounded-2xl text-center ${
            market.outcome ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-rose-600'
          }`}>
            <span className="text-4xl mb-1 block">{market.outcome ? '👍' : '👎'}</span>
            <p className="text-xl font-bold text-white">{market.outcome ? t('bet.yes') : t('bet.no')}!</p>
          </div>
        </div>
      )}
    </div>
  );
}

