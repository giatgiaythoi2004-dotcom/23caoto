'use client';

import React from 'react';
import { Transaction } from '@/server/game/types';
import { formatChips } from '@/lib/utils';
import { History, X, ArrowUpRight, ArrowDownLeft, Shield } from 'lucide-react';

interface LedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

export const LedgerDrawer: React.FC<LedgerDrawerProps> = ({
  isOpen,
  onClose,
  transactions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-zinc-900 border-l border-zinc-800 h-full p-4 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
              NHẬT KÝ BIẾN ĐỘNG CHIP (LEDGER)
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

        {/* Ledger List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {transactions.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 py-10">
              Chưa có giao dịch chip nào được ghi nhận.
            </p>
          ) : (
            transactions
              .slice()
              .reverse()
              .map((tx) => {
                const isGain = tx.type === 'WIN_POT' || tx.type === 'REBUY' || tx.type === 'BUY_IN';
                return (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>{tx.playerName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-normal">
                          Ván #{tx.roundNumber}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold flex items-center gap-0.5 ${
                          isGain ? 'text-emerald-400' : 'text-zinc-400'
                        }`}
                      >
                        {isGain ? '+' : '-'}
                        {formatChips(tx.amount)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-zinc-500">
                      <span className="truncate pr-2">{tx.reason || tx.type}</span>
                      <span className="font-mono text-zinc-400 shrink-0">
                        {formatChips(tx.stackBefore)} → {formatChips(tx.stackAfter)}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};
