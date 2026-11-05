'use client';

import React, { useEffect, useState } from 'react';
import { DebtSettlement } from '@/server/game/types';
import { formatChips } from '@/lib/utils';
import { Calculator, X, ArrowRight, Copy, Check, TrendingUp, TrendingDown } from 'lucide-react';

interface CashoutSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  onFetchSettlement: (cb: (res: any) => void) => void;
}

export const CashoutSummary: React.FC<CashoutSummaryProps> = ({
  isOpen,
  onClose,
  onFetchSettlement,
}) => {
  const [data, setData] = useState<{
    settlements: DebtSettlement[];
    netBalances: { playerId: string; playerName: string; net: number; currentStack: number }[];
  } | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      onFetchSettlement((res) => {
        if (res.success && res.settlement) {
          setData(res.settlement);
        }
      });
    }
  }, [isOpen, onFetchSettlement]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!data) return;
    let text = '🎰 BẢNG QUYẾT TOÁN TIỀN PHÒNG CHƠI 🎰\n\n';
    text += '--- LÃI / LỖ (CHIP) ---\n';
    data.netBalances.forEach((p) => {
      text += `• ${p.playerName}: ${p.net >= 0 ? '+' : ''}${formatChips(p.net)}\n`;
    });
    text += '\n--- LỆNH CHUYỂN KHOẢN TỐI ƯU ---\n';
    if (data.settlements.length === 0) {
      text += 'Mọi người đã hòa vốn!\n';
    } else {
      data.settlements.forEach((s) => {
        text += `👉 ${s.fromPlayerName} chuyển cho ${s.toPlayerName}: ${formatChips(s.amount)}\n`;
      });
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
              BẢNG THANH TOÁN NỢ CUỐI BUỔI
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

        {!data ? (
          <p className="text-center text-xs text-zinc-500 py-8">Đang tính toán bảng nợ...</p>
        ) : (
          <>
            {/* Net Balances List */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                TỔNG KẾT THẮNG / THUA
              </h3>
              <div className="space-y-1.5">
                {data.netBalances.map((item) => (
                  <div
                    key={item.playerId}
                    className="flex justify-between items-center p-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs"
                  >
                    <span className="font-bold text-white">{item.playerName}</span>
                    <span
                      className={`font-mono font-black flex items-center gap-1 ${
                        item.net > 0
                          ? 'text-emerald-400'
                          : item.net < 0
                          ? 'text-red-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {item.net > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : item.net < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5" />
                      ) : null}
                      {item.net >= 0 ? '+' : ''}
                      {formatChips(item.net)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimal Settlement Transfers */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                HƯỚNG DẪN CHUYỂN KHOẢN (ÍT LỆNH NHẤT)
              </h3>
              {data.settlements.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 py-4 bg-zinc-950 rounded-xl border border-zinc-800">
                  Mọi người hòa vốn, không có nợ tồn đọng.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-300">{s.fromPlayerName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-bold text-emerald-300">{s.toPlayerName}</span>
                      </div>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {formatChips(s.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">ĐÃ SAO CHÉP VÀO BỘ NHỚ TẠM!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>SAO CHÉP GỬI NHÓM CHAT (ZALO/MESSENGER)</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
