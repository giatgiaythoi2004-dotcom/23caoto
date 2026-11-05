'use client';

import { useState, useEffect } from 'react';
import { GameState, Player, PlayerActionType } from '@/server/game/types';
import { formatChips } from '@/lib/utils';
import { sound } from '@/lib/soundFX';
import { AlertTriangle, Clock, Flame, Coins, ShieldAlert, Plus, Minus } from 'lucide-react';

interface BettingConsoleProps {
  gameState: GameState;
  localPlayer: Player;
  onAction: (action: PlayerActionType, amount?: number) => void;
  onOpenTopUp: () => void;
}

export const BettingConsole: React.FC<BettingConsoleProps> = ({
  gameState,
  localPlayer,
  onAction,
  onOpenTopUp,
}) => {
  const isMyTurn = gameState.currentTurnPlayerId === localPlayer.id;
  const isFolded = localPlayer.folded;
  const isAllIn = localPlayer.allIn;

  const currentRoundBet = localPlayer.currentRoundBet || 0;
  const currentHighBet = gameState.currentHighBet || 0;
  const callAmount = Math.max(0, currentHighBet - currentRoundBet);
  const minBet = gameState.settings.minBet || 5;
  const bigBlind = gameState.settings.bigBlind || minBet;
  const minRaiseTarget = currentHighBet + (gameState.minRaiseAmount || bigBlind);

  const [raiseBet, setRaiseBet] = useState<number>(minRaiseTarget);
  const [confirmFoldOpen, setConfirmFoldOpen] = useState(false);

  useEffect(() => {
    setRaiseBet(Math.min(localPlayer.stack + currentRoundBet, Math.max(minRaiseTarget, raiseBet)));
  }, [minRaiseTarget, localPlayer.stack, currentRoundBet]);

  const canCheck = callAmount === 0;
  const maxBetPossible = localPlayer.stack + currentRoundBet;

  const handleFoldClick = () => {
    if (canCheck) {
      setConfirmFoldOpen(true);
    } else {
      onAction('FOLD');
    }
  };

  const adjustRaise = (delta: number) => {
    const next = Math.max(minRaiseTarget, Math.min(maxBetPossible, raiseBet + delta));
    setRaiseBet(next);
  };

  const setQuickBet = (target: number) => {
    const clamped = Math.max(minRaiseTarget, Math.min(target, maxBetPossible));
    setRaiseBet(clamped);
  };

  const halfPot = Math.floor(gameState.totalPot * 0.5) + currentHighBet;
  const fullPot = gameState.totalPot + currentHighBet;

  const isLowStack = localPlayer.stack < minBet;

  return (
    <div className="w-full max-w-md mx-auto bg-zinc-900 border-t sm:border border-zinc-800 sm:rounded-3xl p-4 shadow-2xl">
      {/* Turn & Status Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {isMyTurn ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-amber-400 font-extrabold text-sm tracking-wide animate-pulse">
                ĐẾN LƯỢT BẠN!
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                Lượt của:{' '}
                <strong className="text-white">
                  {gameState.players.find((p: Player) => p.id === gameState.currentTurnPlayerId)?.name || 'Chờ...'}
                </strong>
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Chip Balance & Pot Overview */}
      <div className="grid grid-cols-2 gap-3 py-3">
        <div className="bg-zinc-950/80 rounded-2xl p-3 border border-zinc-800/80">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" /> Chip của bạn
          </p>
          <p className="text-2xl font-mono font-black text-amber-400 mt-0.5">
            {formatChips(localPlayer.stack)}
          </p>
          <div className="text-[10px] text-zinc-500 mt-0.5 flex justify-between">
            <span>Đã cược ván:</span>
            <span className="font-mono text-zinc-400">{formatChips(currentRoundBet)}</span>
          </div>
        </div>

        <div className="bg-zinc-950/80 rounded-2xl p-3 border border-zinc-800/80">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-emerald-400" /> Pot hiện tại
          </p>
          <p className="text-2xl font-mono font-black text-emerald-400 mt-0.5">
            {formatChips(gameState.totalPot)}
          </p>
          <div className="text-[10px] text-zinc-500 mt-0.5 flex justify-between">
            <span>Cần theo:</span>
            <span className={`font-mono font-bold ${callAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {callAmount > 0 ? formatChips(callAmount) : 'Miễn phí'}
            </span>
          </div>
        </div>
      </div>

      {/* Low stack warning + top-up button */}
      {isLowStack && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-700/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-semibold">Chip thấp! Nạp thêm để tiếp tục cược.</p>
          </div>
          <button
            type="button"
            onClick={onOpenTopUp}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-[11px] whitespace-nowrap"
          >
            NẠP THÊM
          </button>
        </div>
      )}

      {/* Folded state */}
      {isFolded && (
        <div className="py-4 text-center bg-zinc-950/50 rounded-2xl border border-zinc-800/50 my-2">
          <p className="text-zinc-500 text-sm font-semibold">Bạn đã Úp bài ở ván này</p>
          <p className="text-zinc-600 text-xs mt-1">Đang theo dõi các người chơi khác...</p>
        </div>
      )}

      {/* All-in state */}
      {isAllIn && !isFolded && (
        <div className="py-4 text-center bg-amber-950/20 rounded-2xl border border-amber-800/40 my-2">
          <p className="text-amber-400 text-sm font-black tracking-wide">🔥 BẠN ĐÃ TẤT TAY (ALL-IN)!</p>
          <p className="text-zinc-400 text-xs mt-1">Chờ đến Showdown...</p>
        </div>
      )}

      {/* Active Action Controls */}
      {!isFolded && !isAllIn && (
        <div className={`space-y-3 transition-opacity ${!isMyTurn ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Raise section */}
          <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800/80 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mức Tố (Raise)</span>
              <span className="font-mono font-black text-lg text-amber-400">{formatChips(raiseBet)}</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={Math.min(minRaiseTarget, maxBetPossible)}
              max={maxBetPossible}
              step={minBet}
              value={raiseBet}
              onChange={(e) => setRaiseBet(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg cursor-pointer accent-amber-500"
            />

            {/* Stepper buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustRaise(-minBet)}
                className="flex-none w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 font-bold"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustRaise(5)}
                  className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => adjustRaise(10)}
                  className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setQuickBet(halfPot)}
                  className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                >
                  ½Pot
                </button>
                <button
                  type="button"
                  onClick={() => setQuickBet(fullPot)}
                  className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                >
                  Pot
                </button>
              </div>
              <button
                type="button"
                onClick={() => adjustRaise(minBet)}
                className="flex-none w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons — 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* FOLD */}
            <button
              type="button"
              onClick={handleFoldClick}
              className="py-4 px-3 rounded-2xl bg-zinc-800 hover:bg-red-950/80 active:bg-red-900 border border-zinc-700 hover:border-red-700 text-zinc-200 hover:text-red-300 font-black text-sm tracking-wide transition-all shadow-md active:scale-[0.98]"
            >
              ÚP BÀI
            </button>

            {/* CHECK or CALL */}
            {canCheck ? (
              <button
                type="button"
                onClick={() => onAction('CHECK')}
                className="py-4 px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 border border-emerald-500 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-emerald-700/20 active:scale-[0.98]"
              >
                XEM BÀI ✓
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAction('CALL')}
                className="py-4 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 border border-amber-300 text-zinc-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-amber-500/30 active:scale-[0.98]"
              >
                THEO {formatChips(Math.min(callAmount, localPlayer.stack))}
              </button>
            )}

            {/* RAISE */}
            <button
              type="button"
              onClick={() => onAction('RAISE', raiseBet)}
              disabled={localPlayer.stack <= callAmount}
              className="py-4 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-400 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98] disabled:opacity-40"
            >
              TỐ {formatChips(raiseBet)}
            </button>

            {/* ALL-IN */}
            <button
              type="button"
              onClick={() => onAction('ALL_IN')}
              className="py-4 px-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:from-red-700 border border-red-500 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-red-600/30 active:scale-[0.98]"
            >
              TẤT TAY 🔥
            </button>
          </div>

          {/* Nạp thêm chip button (accessible always when active) */}
          <button
            type="button"
            onClick={onOpenTopUp}
            className="w-full py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            Nạp thêm chip vào bàn
          </button>
        </div>
      )}

      {/* Confirm Fold Modal */}
      {confirmFoldOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bạn có thể Xem miễn phí!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Không ai tố thêm chip. Bạn không cần mất chip để tiếp tục ván. Vẫn muốn Úp bài?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setConfirmFoldOpen(false); onAction('CHECK'); }}
                className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                XEM BÀI ✓
              </button>
              <button
                type="button"
                onClick={() => { setConfirmFoldOpen(false); onAction('FOLD'); }}
                className="py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold text-xs"
              >
                VẪN ÚP BÀI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
