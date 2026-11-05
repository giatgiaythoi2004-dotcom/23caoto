'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '../hooks/useSocket';
import { formatChips } from '../lib/utils';

type Tab = 'join' | 'create';

export default function LobbyPage() {
  const router = useRouter();
  const { createRoom, joinRoom } = useSocket();

  const [tab, setTab] = useState<Tab>('join');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Join form
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [joinChip, setJoinChip] = useState<number>(200);

  // Create form
  const [tableName, setTableName] = useState('Bàn Chơi');
  const [hostName, setHostName] = useState('');
  const [hostChip, setHostChip] = useState<number>(200);
  const [tienGa, setTienGa] = useState<number>(10); // 5 / 10 / 20
  const [minBet, setMinBet] = useState<number>(5);
  const [dealerRule, setDealerRule] = useState<'WINNER_DEALS' | 'CLOCKWISE'>('WINNER_DEALS');
  const [createPin, setCreatePin] = useState('');

  const goErr = (msg: string) => { setError(msg); setLoading(false); };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || joinCode.trim().length < 4) return goErr('Nhập mã phòng!');
    if (!joinName.trim()) return goErr('Nhập tên của bạn!');
    if (!joinChip || joinChip <= 0) return goErr('Nhập số chip mang vào bàn!');
    setLoading(true); setError('');
    joinRoom({
      roomCode: joinCode.trim().toUpperCase(),
      playerName: joinName.trim(),
      pin: joinPin.trim() || undefined,
      customStack: joinChip,
    }, res => {
      setLoading(false);
      if (res.success) router.push(`/table/${joinCode.trim().toUpperCase()}`);
      else setError(res.error || 'Không thể tham gia!');
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return goErr('Nhập tên chủ bàn!');
    if (!hostChip || hostChip <= 0) return goErr('Nhập số chip mang vào!');
    setLoading(true); setError('');
    createRoom({
      roomName: tableName.trim() || 'Bàn Chơi',
      hostName: hostName.trim(),
      pin: createPin.trim() || undefined,
      customStack: hostChip,
      settings: {
        startingStack: hostChip,
        tienGa,
        ante: tienGa,
        minBet,
        bigBlind: minBet,
        smallBlind: 0,
        dealerRule,
        ruleVariant: 'SIMPLE_BET',
        allowAllIn: true,
        turnTimeoutSec: 0,
      },
    }, res => {
      setLoading(false);
      if (res.success && res.roomCode) router.push(`/table/${res.roomCode}`);
      else setError(res.error || 'Không thể tạo phòng!');
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-between px-4 py-6">
      {/* Logo */}
      <div className="text-center pt-2">
        <div className="text-4xl mb-1">🃏</div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          CHIP <span className="text-amber-400">CASINO</span>
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">Quản lý chip • Cược thời gian thực</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-sm mt-4 mb-4">
        {/* Tab Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button type="button" onClick={() => { setTab('join'); setError(''); }}
            className={`py-3 rounded-2xl font-black text-sm transition-all ${tab === 'join' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
            🚪 VÀO BÀN
          </button>
          <button type="button" onClick={() => { setTab('create'); setError(''); }}
            className={`py-3 rounded-2xl font-black text-sm transition-all ${tab === 'create' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
            ✨ TẠO BÀN
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* JOIN FORM */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="bg-slate-900 rounded-3xl p-5 space-y-4 border border-slate-700/50">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mã phòng</label>
              <input type="text" maxLength={6}
                value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="VD: ABC123"
                className="mt-1.5 w-full bg-slate-950 border-2 border-slate-700 rounded-xl py-3 px-4 text-2xl font-mono font-black text-center text-amber-400 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 tracking-widest"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tên của bạn</label>
              <input type="text" maxLength={14}
                value={joinName} onChange={e => setJoinName(e.target.value)}
                placeholder="Nhập nickname..."
                className="mt-1.5 w-full bg-slate-950 border-2 border-slate-700 rounded-xl py-3 px-4 text-base font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Chip mang vào bàn
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input type="number" min={10} max={99999} step={10}
                  value={joinChip} onChange={e => setJoinChip(Number(e.target.value))}
                  className="flex-1 bg-slate-950 border-2 border-slate-700 rounded-xl py-3 px-4 text-lg font-mono font-black text-green-400 text-center focus:outline-none focus:border-green-500"
                />
                <span className="text-slate-400 text-sm font-bold">chip</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[100, 200, 500, 1000].map(v => (
                  <button key={v} type="button" onClick={() => setJoinChip(v)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${joinChip === v ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PIN phòng (nếu có)</label>
              <input type="password" maxLength={6}
                value={joinPin} onChange={e => setJoinPin(e.target.value)}
                placeholder="Bỏ trống nếu không có"
                className="mt-1.5 w-full bg-slate-950 border-2 border-slate-700 rounded-xl py-2.5 px-4 text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.97] text-slate-950 font-black text-base tracking-wide uppercase shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50">
              {loading ? '⏳ Đang kết nối...' : '🃏 VÀO BÀN NGAY'}
            </button>
          </form>
        )}

        {/* CREATE FORM */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="bg-slate-900 rounded-3xl p-5 space-y-4 border border-slate-700/50">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tên bàn chơi</label>
              <input type="text" value={tableName} onChange={e => setTableName(e.target.value)}
                placeholder="VD: Bàn Liêng Thứ 7"
                className="mt-1.5 w-full bg-slate-950 border-2 border-slate-700 rounded-xl py-3 px-4 text-base font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tên chủ bàn (bạn)</label>
              <input type="text" maxLength={14} value={hostName} onChange={e => setHostName(e.target.value)}
                placeholder="Nhập tên của bạn..."
                className="mt-1.5 w-full bg-slate-950 border-2 border-slate-700 rounded-xl py-3 px-4 text-base font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chip mang vào bàn (bạn)</label>
              <div className="mt-1.5 flex items-center gap-2">
                <input type="number" min={10} step={10}
                  value={hostChip} onChange={e => setHostChip(Number(e.target.value))}
                  className="flex-1 bg-slate-950 border-2 border-slate-700 rounded-xl py-3 px-4 text-lg font-mono font-black text-green-400 text-center focus:outline-none focus:border-green-500"
                />
                <span className="text-slate-400 text-sm font-bold">chip</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[100, 200, 500, 1000].map(v => (
                  <button key={v} type="button" onClick={() => setHostChip(v)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${hostChip === v ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Tiền Gà */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Tiền gà đầu ván 🐔
              </label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[0, 5, 10, 20].map(v => (
                  <button key={v} type="button" onClick={() => setTienGa(v)}
                    className={`py-2.5 rounded-xl font-black text-sm transition-all ${tienGa === v ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400' : 'bg-slate-800 border-2 border-transparent text-slate-400'}`}>
                    {v === 0 ? 'Không' : `${v}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Bet */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mức cược tối thiểu</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[5, 10, 20, 50].map(v => (
                  <button key={v} type="button" onClick={() => setMinBet(v)}
                    className={`py-2.5 rounded-xl font-black text-sm transition-all ${minBet === v ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400' : 'bg-slate-800 border-2 border-transparent text-slate-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Dealer Rule */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Luật chia bài</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button type="button" onClick={() => setDealerRule('WINNER_DEALS')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all ${dealerRule === 'WINNER_DEALS' ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-400' : 'bg-slate-800 border-2 border-transparent text-slate-400'}`}>
                  🏆 Thắng làm Cái
                  <div className="text-[10px] opacity-70 font-normal">Tố đầu ván sau</div>
                </button>
                <button type="button" onClick={() => setDealerRule('CLOCKWISE')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold text-left transition-all ${dealerRule === 'CLOCKWISE' ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400' : 'bg-slate-800 border-2 border-transparent text-slate-400'}`}>
                  🔄 Xoay vòng
                  <div className="text-[10px] opacity-70 font-normal">Kim đồng hồ</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PIN bảo vệ (tùy chọn)</label>
              <input type="password" maxLength={6} value={createPin} onChange={e => setCreatePin(e.target.value)}
                placeholder="Để trống = không khóa"
                className="mt-1.5 w-full bg-slate-950 border-2 border-slate-700 rounded-xl py-2.5 px-4 text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] text-slate-950 font-black text-base tracking-wide uppercase shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50">
              {loading ? '⏳ Đang tạo...' : '✨ TẠO BÀN & LÀM CHỦ BÀN'}
            </button>
          </form>
        )}
      </div>

      {/* Footer note */}
      <div className="text-center pb-2">
        <p className="text-slate-600 text-[11px]">
          Chip ảo · Không tiền thật · Chỉ dùng quản lý cược bài ngoài đời
        </p>
      </div>
    </div>
  );
}
