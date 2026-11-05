'use client';

import React from 'react';
import { GameState, Player, Pot } from '@/server/game/types';
import { formatChips } from '@/lib/utils';
import { Coins, Flame, User, Wifi, WifiOff } from 'lucide-react';

interface TableFeltProps {
  gameState: GameState;
  localPlayerId?: string;
  onSeatClick?: (seatNumber: number) => void;
}

export const TableFelt: React.FC<TableFeltProps> = ({ gameState, localPlayerId }) => {
  // 6 fixed seat positions around the oval table (percentage coordinates)
  const seatPositions = [
    { top: '10%', left: '22%' },  // Seat 1: Top-Left
    { top: '10%', left: '78%' },  // Seat 2: Top-Right
    { top: '50%', left: '92%' },  // Seat 3: Mid-Right
    { top: '90%', left: '78%' },  // Seat 4: Bottom-Right
    { top: '90%', left: '22%' },  // Seat 5: Bottom-Left
    { top: '50%', left: '8%' },   // Seat 6: Mid-Left
  ];

  return (
    <div className="relative w-full max-w-2xl aspect-[4/3] sm:aspect-[16/10] mx-auto p-4 flex items-center justify-center select-none">
      {/* Outer Wooden Table Rail */}
      <div className="relative w-full h-full rounded-[100px] sm:rounded-[140px] bg-[#22130c] p-3 sm:p-4 shadow-2xl border-4 border-[#3e2217] flex items-center justify-center">
        {/* Inner Green Felt Table */}
        <div className="relative w-full h-full rounded-[85px] sm:rounded-[120px] bg-poker-felt border-2 border-emerald-500/30 shadow-inner flex flex-col items-center justify-center overflow-hidden">
          
          {/* Subtle Table Logo Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
            <span className="text-8xl font-black tracking-widest text-white">CASINO</span>
          </div>

          {/* Table Center: Pot & Round Information */}
          <div className="z-10 text-center px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-sm border border-emerald-500/20 shadow-lg">
            <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {gameState.roomName} · VÁN #{gameState.roundNumber}
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xl sm:text-3xl font-mono font-black text-amber-400 tracking-tight">
                {formatChips(gameState.totalPot)}
              </span>
              <span className="text-[11px] font-bold text-amber-300/80">CHIP</span>
            </div>

            {/* Pots breakdown if side pots exist */}
            {gameState.pots.length > 1 && (
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {gameState.pots.map((pot: Pot, idx: number) => (
                  <span
                    key={pot.id}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 text-zinc-300 border border-zinc-700"
                  >
                    {idx === 0 ? 'Main' : `Side #${idx}`}: {formatChips(pot.amount)}
                  </span>
                ))}
              </div>
            )}

            {/* Last Action ticker */}
            <div className="text-[10px] sm:text-xs text-zinc-300 mt-1 max-w-[200px] sm:max-w-xs truncate">
              {gameState.lastActionSummary}
            </div>
          </div>

          {/* 6 Seats Rendered Around Table */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const seatNumber = idx + 1;
            const player = gameState.players.find((p: Player) => p.seatNumber === seatNumber);
            const pos = seatPositions[idx];
            const isTurn = player && gameState.currentTurnPlayerId === player.id;
            const isDealer = gameState.dealerIndex === gameState.players.indexOf(player!);
            const isMe = player && player.id === localPlayerId;

            return (
              <div
                key={seatNumber}
                style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
                className="absolute z-20"
              >
                {player ? (
                  <div
                    className={`relative flex flex-col items-center transition-all ${
                      player.folded ? 'opacity-40 grayscale' : 'opacity-100'
                    }`}
                  >
                    {/* Dealer Button Badge */}
                    {isDealer && (
                      <div className="absolute -top-2.5 -right-2.5 z-30 w-5 h-5 rounded-full bg-white text-zinc-950 font-black text-[10px] flex items-center justify-center border-2 border-black shadow-md">
                        D
                      </div>
                    )}

                    {/* Turn Glow / Avatar Card */}
                    <div
                      className={`relative w-12 sm:w-16 h-12 sm:h-16 rounded-2xl flex items-center justify-center p-1 shadow-xl transition-all ${
                        isTurn
                          ? 'ring-4 ring-amber-400 bg-amber-500/20 scale-105 shadow-glow-gold'
                          : isMe
                          ? 'ring-2 ring-emerald-400 bg-emerald-950/80'
                          : 'bg-zinc-900/90 border border-zinc-700'
                      }`}
                    >
                      {/* Avatar initial or icon */}
                      <div className="w-full h-full rounded-xl bg-zinc-800 flex flex-col items-center justify-center">
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />
                        <span className="text-[8px] font-mono font-bold text-zinc-400">
                          #{player.seatNumber}
                        </span>
                      </div>

                      {/* Connection Dot */}
                      <div className="absolute bottom-1 right-1">
                        {player.connected ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 block shadow-sm"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-500 block shadow-sm"></span>
                        )}
                      </div>
                    </div>

                    {/* Player Name & Stack */}
                    <div className="mt-1 px-1.5 py-0.5 rounded-lg bg-black/80 backdrop-blur-sm border border-zinc-800 text-center min-w-[70px] sm:min-w-[85px] shadow">
                      <p className="text-[10px] sm:text-xs font-bold text-white truncate max-w-[80px]">
                        {player.name} {isMe && '(Bạn)'}
                      </p>
                      <p className="text-[9px] sm:text-[11px] font-mono font-black text-amber-400">
                        {formatChips(player.stack)}
                      </p>
                    </div>

                    {/* Action Status Badge (Folded, All-In, Bet) */}
                    {player.folded && (
                      <span className="absolute -bottom-4 text-[9px] font-bold text-red-400 bg-red-950/90 px-1 rounded border border-red-800">
                        FOLD
                      </span>
                    )}
                    {player.allIn && !player.folded && (
                      <span className="absolute -bottom-4 text-[9px] font-black text-amber-400 bg-amber-950/90 px-1 rounded border border-amber-600 animate-pulse">
                        ALL-IN
                      </span>
                    )}

                    {/* Bet in front of player */}
                    {player.currentRoundBet > 0 && !player.folded && (
                      <div className="absolute -top-6 px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/60 shadow flex items-center gap-1">
                        <Coins className="w-2.5 h-2.5 text-amber-400" />
                        <span className="text-[9px] font-mono font-bold text-emerald-300">
                          {formatChips(player.currentRoundBet)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty Seat */
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl border-2 border-dashed border-emerald-900/60 bg-emerald-950/20 flex flex-col items-center justify-center opacity-40">
                    <span className="text-[10px] font-mono font-bold text-emerald-600">
                      #{seatNumber}
                    </span>
                    <span className="text-[8px] text-emerald-700">Trống</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
