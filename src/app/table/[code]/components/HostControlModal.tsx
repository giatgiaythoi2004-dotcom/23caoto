'use client';

import React, { useState } from 'react';
import { GameState, Player, RoomSettings, DealerRule } from '@/server/game/types';
import { formatChips } from '@/lib/utils';
import { Settings, UserX, PlusCircle, MinusCircle, Play, Shield, X, AlertCircle } from 'lucide-react';

interface HostControlModalProps {
  gameState: GameState;
  hostId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartHand: () => void;
  onAdjustStack: (targetPlayerId: string, delta: number, reason: string) => void;
  onKickPlayer: (targetPlayerId: string) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
}

export const HostControlModal: React.FC<HostControlModalProps> = ({
  gameState,
  hostId,
  isOpen,
  onClose,
  onStartHand,
  onAdjustStack,
  onKickPlayer,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'players' | 'settings'>('players');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(gameState.players[0]?.id || '');
  const [adjustAmount, setAdjustAmount] = useState<number>(5000);
  const [adjustReason, setAdjustReason] = useState<string>('Mua thêm chip (Rebuy)');

  // Settings form
  const [sb, setSb] = useState(gameState.settings.smallBlind);
  const [bb, setBb] = useState(gameState.settings.bigBlind);
  const [ante, setAnte] = useState(gameState.settings.ante);
  const [dealerRule, setDealerRule] = useState<DealerRule>(gameState.settings.dealerRule || 'WINNER_DEALS');

  if (!isOpen) return null;

  const handleAdjust = (isAdd: boolean) => {
    if (!selectedPlayerId || adjustAmount <= 0) return;
    const delta = isAdd ? adjustAmount : -adjustAmount;
    onAdjustStack(selectedPlayerId, delta, adjustReason);
  };

  const handleSaveSettings = () => {
    onUpdateSettings({
      smallBlind: sb,
      bigBlind: bb,
      ante,
      minBet: bb,
      dealerRule,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
              QUẢN TRỊ CHỦ BÀN (HOST)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Start Hand Button if in Lobby or Finished */}
        {(gameState.phase === 'LOBBY' || gameState.phase === 'FINISHED') && (
          <div className="my-3">
            <button
              type="button"
              onClick={() => {
                onStartHand();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>BẮT ĐẦU VÁN TIẾP THEO</span>
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl my-3 border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'players'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            QUẢN LÝ CHIP & NGƯỜI CHƠI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'settings'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            CÀI ĐẶT MỨC CƯỢC
          </button>
        </div>

        {/* TAB 1: PLAYER & CHIP ADJUSTMENTS */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                CHỌN NGƯỜI CHƠI
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {gameState.players.map((p: Player) => (
                  <option key={p.id} value={p.id}>
                    Ghế #{p.seatNumber}: {p.name} (Hiện có: {formatChips(p.stack)} chip)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                SỐ CHIP CẦN ĐIỀU CHỈNH
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={500}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-sm font-mono text-white"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[1000, 5000, 10000, 20000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdjustAmount(amt)}
                    className="py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-300"
                  >
                    +{amt >= 1000 ? `${amt / 1000}K` : amt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                LÝ DO ĐIỀU CHỈNH (GHI VÀO AUDIT LOG)
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="VD: Mua thêm chip, bù sai sót..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-1.5 px-3 text-xs text-white"
              />
            </div>

            {/* Adjust Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAdjust(true)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>CỘNG CHIP (+REBUY)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdjust(false)}
                className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-red-950 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <MinusCircle className="w-4 h-4" />
                <span>TRỪ CHIP</span>
              </button>
            </div>

            {/* Kick Player button */}
            <div className="pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn chắc chắn muốn mời người chơi này rời bàn?')) {
                    onKickPlayer(selectedPlayerId);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-950 text-red-400 border border-red-900/60 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <UserX className="w-4 h-4" />
                <span>MỜI NGƯỜI CHƠI NÀY RỜI BÀN (KICK)</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Small Blind (SB)
                </label>
                <input
                  type="number"
                  value={sb}
                  onChange={(e) => setSb(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Big Blind (BB)
                </label>
                <input
                  type="number"
                  value={bb}
                  onChange={(e) => setBb(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-sm font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Tiền sàn (Ante)
              </label>
              <input
                type="number"
                value={ante}
                onChange={(e) => setAnte(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-sm font-mono text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Quy tắc chia bài & Tố đầu
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDealerRule('WINNER_DEALS')}
                  className={`p-2 rounded-xl border text-xs font-bold text-left transition-all ${
                    dealerRule === 'WINNER_DEALS'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <p className="font-bold">🏆 Thắng làm Cái & Tố đầu</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDealerRule('CLOCKWISE')}
                  className={`p-2 rounded-xl border text-xs font-bold text-left transition-all ${
                    dealerRule === 'CLOCKWISE'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <p className="font-bold">🔄 Xoay kim đồng hồ</p>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
            >
              LƯU CÀI ĐẶT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
