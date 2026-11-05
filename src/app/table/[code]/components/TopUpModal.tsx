'use client';

import React, { useState } from 'react';
import { X, Coins, Plus } from 'lucide-react';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStack: number;
  playerName: string;
  onConfirm: (amount: number) => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  currentStack,
  playerName,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<number>(100);
  const [customInput, setCustomInput] = useState<string>('');
  const presets = [50, 100, 200, 500];

  if (!isOpen) return null;

  const finalAmount = customInput !== '' ? Number(customInput) : amount;

  const handleConfirm = () => {
    if (finalAmount > 0) {
      onConfirm(finalAmount);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">NẠP THÊM CHIP</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current stack info */}
        <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
          <p className="text-xs text-zinc-400">{playerName} đang có</p>
          <p className="text-2xl font-mono font-black text-amber-400">{currentStack} chip</p>
        </div>

        {/* Preset buttons */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-2">CHỌN NHANH:</p>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setAmount(p); setCustomInput(''); }}
                className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                  amount === p && customInput === ''
                    ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                +{p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-1">HOẶC NHẬP SỐ KHÁC:</p>
          <input
            type="number"
            min={1}
            max={9999}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="VD: 150"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Confirm */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={finalAmount <= 0 || isNaN(finalAmount)}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-sm uppercase tracking-wide shadow-lg shadow-amber-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          NẠP {finalAmount > 0 ? finalAmount : '...'} CHIP VÀO BÀN
        </button>
      </div>
    </div>
  );
};
