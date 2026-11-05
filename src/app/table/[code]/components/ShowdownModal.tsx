'use client';

import React, { useState } from 'react';
import { GameState, Pot, Player } from '@/server/game/types';
import { formatChips } from '@/lib/utils';
import { Trophy, Check, Users, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ShowdownModalProps {
  gameState: GameState;
  isHost: boolean;
  onConfirmWinners: (payouts: { potId: string; winnerIds: string[] }[]) => void;
}

export const ShowdownModal: React.FC<ShowdownModalProps> = ({
  gameState,
  isHost,
  onConfirmWinners,
}) => {
  // Map potId -> array of selected winner playerIds
  const [selectedWinners, setSelectedWinners] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const pot of gameState.pots) {
      initial[pot.id] = [];
    }
    return initial;
  });

  const toggleWinner = (potId: string, playerId: string) => {
    setSelectedWinners((prev) => {
      const current = prev[potId] || [];
      if (current.includes(playerId)) {
        return { ...prev, [potId]: current.filter((id) => id !== playerId) };
      } else {
        return { ...prev, [potId]: [...current, playerId] };
      }
    });
  };

  const handleConfirm = () => {
    const payouts = Object.entries(selectedWinners).map(([potId, winnerIds]) => ({
      potId,
      winnerIds,
    }));

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    onConfirmWinners(payouts);
  };

  const canConfirm = gameState.pots.every(
    (pot: Pot) => selectedWinners[pot.id] && selectedWinners[pot.id].length > 0
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center pb-3 border-b border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-white">PHÂN ĐỊNH SHOWDOWN</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isHost
              ? 'Xem bài lá ngoài đời và chọn người thắng cho từng Pot'
              : 'Chờ Chủ bàn (Host) xác nhận người thắng ngoài đời...'}
          </p>
        </div>

        {/* Pots list */}
        <div className="py-4 space-y-4">
          {gameState.pots.map((pot: Pot, idx: number) => {
            const winners = selectedWinners[pot.id] || [];
            const eligiblePlayers = gameState.players.filter((p: Player) =>
              pot.eligiblePlayerIds.includes(p.id)
            );

            return (
              <div
                key={pot.id}
                className="bg-zinc-950/80 rounded-2xl p-3.5 border border-zinc-800 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white">{pot.name}</h3>
                    <p className="text-[11px] text-zinc-500">
                      {eligiblePlayers.length} người đủ điều kiện ăn hũ
                    </p>
                  </div>
                  <span className="font-mono font-black text-amber-400 text-base">
                    {formatChips(pot.amount)} chip
                  </span>
                </div>

                {/* Candidate Players */}
                <div className="grid grid-cols-2 gap-2">
                  {eligiblePlayers.map((player: Player) => {
                    const isSelected = winners.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        disabled={!isHost}
                        onClick={() => toggleWinner(pot.id, player.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white font-bold ring-1 ring-amber-500'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        } ${!isHost ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                      >
                        <div className="truncate pr-1">
                          <p className="text-xs truncate">{player.name}</p>
                          <p className="text-[10px] font-mono text-zinc-500">Ghế #{player.seatNumber}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Split Pot preview notice */}
                {winners.length > 1 && (
                  <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-[11px] text-emerald-300 text-center">
                    Chia đều ({winners.length} người):{' '}
                    <strong>{formatChips(Math.floor(pot.amount / winners.length))} chip/người</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Host Submission Button */}
        {isHost ? (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] text-white font-black text-sm tracking-wide uppercase shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>XÁC NHẬN & TRAO CHIP</span>
          </button>
        ) : (
          <div className="text-center text-xs text-zinc-500 py-2">
            Đang chờ Host chốt kết quả...
          </div>
        )}
      </div>
    </div>
  );
};
