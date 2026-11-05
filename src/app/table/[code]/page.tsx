'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import { TableFelt } from './components/TableFelt';
import { BettingConsole } from './components/BettingConsole';
import { ShowdownModal } from './components/ShowdownModal';
import { HostControlModal } from './components/HostControlModal';
import { LedgerDrawer } from './components/LedgerDrawer';
import { CashoutSummary } from './components/CashoutSummary';
import { QRModal } from './components/QRModal';
import { TopUpModal } from './components/TopUpModal';
import { sound } from '../../../lib/soundFX';
import {
  Volume2,
  VolumeX,
  QrCode,
  History,
  Calculator,
  Shield,
  Play,
  ArrowLeft,
  Users,
  Coins,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function TablePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();

  const {
    gameState,
    isConnected,
    joinRoom,
    sendAction,
    hostStartGame,
    hostShowdownWinner,
    hostAdjustStack,
    hostKickPlayer,
    hostUpdateSettings,
    getSettlement,
    topUpChips,
  } = useSocket(roomCode);

  // Local user state
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState<boolean>(false);
  const [joinNickname, setJoinNickname] = useState<string>('');
  const [joinPin, setJoinPin] = useState<string>('');
  const [joinChips, setJoinChips] = useState<number>(200);
  const [joinError, setJoinError] = useState<string>('');

  // Modals state
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Check stored credentials
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Keep identity per tab so opening the same room link in another tab
      // creates a separate player instead of reusing the first tab's seat.
      const storedId = sessionStorage.getItem(`player_${roomCode}`);
      const storedToken = sessionStorage.getItem(`token_${roomCode}`);
      if (storedId && storedToken) {
        setLocalPlayerId(storedId);
      } else {
        sessionStorage.removeItem(`player_${roomCode}`);
        sessionStorage.removeItem(`token_${roomCode}`);
        setJoinModalOpen(true);
      }
    }
  }, [roomCode]);

  useEffect(() => {
    const handleReconnectFailed = () => {
      setLocalPlayerId(null);
      setJoinModalOpen(true);
      setJoinError('Phiên cũ không còn hợp lệ. Vui lòng tham gia lại phòng.');
    };
    window.addEventListener('casino:reconnect-failed', handleReconnectFailed);
    return () => window.removeEventListener('casino:reconnect-failed', handleReconnectFailed);
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    sound.setEnabled(nextVal);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinNickname.trim()) {
      setJoinError('Vui lòng nhập tên của bạn!');
      return;
    }
    setJoinError('');

    joinRoom(
      {
        roomCode,
        playerName: joinNickname.trim(),
        pin: joinPin.trim() || undefined,
        customStack: joinChips > 0 ? joinChips : undefined,
      },
      (res) => {
        if (res.success && res.playerId) {
          setLocalPlayerId(res.playerId);
          setJoinModalOpen(false);
        } else {
          setJoinError(res.error || 'Không thể tham gia phòng!');
        }
      }
    );
  };

  const localPlayer = gameState?.players.find((p) => p.id === localPlayerId);
  const isHost = localPlayer?.isHost ?? false;

  const handleTopUp = (amount: number) => {
    if (!localPlayer) return;
    topUpChips(localPlayer.id, amount, 'Nạp thêm chip', (res) => {
      if (!res?.success) {
        console.error('Top up failed:', res?.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
      {/* TOP NAV BAR */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-400 font-mono tracking-wider">
                #{roomCode}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                  isConnected
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                    : 'bg-red-950 text-red-400 border-red-800/60'
                }`}
              >
                {isConnected ? (gameState ? `Ván #${gameState.roundNumber}` : 'Đã kết nối') : 'Mất kết nối'}
              </span>
            </div>
            <p className="text-[11px] font-bold text-white truncate max-w-[130px] sm:max-w-[200px]">
              {gameState?.roomName || 'Bàn chơi'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
          <button
            type="button"
            onClick={() => setTopUpOpen(true)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400"
            title="Nạp thêm chip"
          >
            <Coins className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setLedgerOpen(true)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCashoutOpen(true)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400"
          >
            <Calculator className="w-4 h-4" />
          </button>
          {isHost && (
            <button
              type="button"
              onClick={() => setHostModalOpen(true)}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto flex flex-col">
        {!gameState ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-zinc-400">Đang đồng bộ bàn #{roomCode}...</p>
          </div>
        ) : (
          <>
            {/* Table Overview */}
            <div className="px-2 sm:px-4 pt-2">
              <TableFelt gameState={gameState} localPlayerId={localPlayerId || undefined} />
            </div>

            {/* Lobby waiting room */}
            {gameState.phase === 'LOBBY' && (
              <div className="max-w-md mx-auto px-4 py-3 w-full">
                <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
                  <Users className="w-8 h-8 text-amber-400 mx-auto" />
                  <h3 className="text-base font-extrabold text-white">PHÒNG CHỜ BẮT ĐẦU</h3>
                  <p className="text-xs text-zinc-400">
                    Hiện có <strong className="text-white">{gameState.players.length}/6</strong> người chơi tại bàn.
                  </p>
                  {gameState.settings.tienGa > 0 && (
                    <p className="text-xs text-amber-400">
                      🐓 Tiền Gà: <strong>{gameState.settings.tienGa} chip/người/ván</strong>
                    </p>
                  )}
                  {isHost && localPlayer ? (
                    <button
                      type="button"
                      onClick={() => hostStartGame(localPlayer.id)}
                      disabled={gameState.players.length < 2}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      BẮT ĐẦU ({gameState.players.length} NGƯỜI)
                    </button>
                  ) : (
                    <div className="p-2 rounded-xl bg-zinc-950 text-zinc-500 text-xs">
                      Đang chờ Chủ bàn bấm bắt đầu...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Finished hand banner */}
            {gameState.phase === 'FINISHED' && (
              <div className="max-w-md mx-auto px-4 py-3 w-full">
                <div className="p-4 rounded-3xl bg-emerald-950/40 border border-emerald-700/50 text-center space-y-2">
                  <p className="text-sm font-black text-emerald-300">{gameState.lastActionSummary}</p>
                  {isHost && localPlayer && (
                    <button
                      type="button"
                      onClick={() => hostStartGame(localPlayer.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow"
                    >
                      CHIA TIẾP VÁN MỚI
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Betting Console */}
            {localPlayer && gameState.phase !== 'LOBBY' && (
              <div className="mt-auto px-2 sm:px-4 pb-4">
                <BettingConsole
                  gameState={gameState}
                  localPlayer={localPlayer}
                  onAction={(action, amount) => {
                    sendAction({
                      roomId: roomCode,
                      playerId: localPlayer.id,
                      action,
                      amount,
                      idempotencyKey: `${localPlayer.id}-${gameState.roundNumber}-${Date.now()}`,
                    });
                  }}
                  onOpenTopUp={() => setTopUpOpen(true)}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* JOIN MODAL */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleJoinSubmit}
            className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="text-center">
              <h2 className="text-lg font-extrabold text-white">THAM GIA BÀN #{roomCode}</h2>
              <p className="text-xs text-zinc-400 mt-1">Nhập tên để ngồi vào bàn</p>
            </div>

            {joinError && (
              <div className="p-2.5 rounded-lg bg-red-950 border border-red-800 text-red-300 text-xs text-center">
                {joinError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">TÊN CỦA BẠN</label>
              <input
                type="text"
                maxLength={16}
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                placeholder="VD: Cường Poker"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">SỐ CHIP VÀO BÀN</label>
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                {[100, 200, 300, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setJoinChips(v)}
                    className={`py-2 rounded-xl font-bold text-sm transition-all ${
                      joinChips === v
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={9999}
                value={joinChips}
                onChange={(e) => setJoinChips(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">MÃ PIN (NẾU CÓ)</label>
              <input
                type="password"
                maxLength={6}
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                placeholder="Để trống nếu không có"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20"
            >
              NGỒI VÀO BÀN ({joinChips} CHIP)
            </button>
          </form>
        </div>
      )}

      {/* SHOWDOWN MODAL */}
      {gameState && gameState.phase === 'SHOWDOWN' && (
        <ShowdownModal
          gameState={gameState}
          isHost={isHost}
          onConfirmWinners={(payouts) => {
            if (localPlayer) {
              hostShowdownWinner(localPlayer.id, payouts);
            }
          }}
        />
      )}

      {/* HOST CONTROL MODAL */}
      {gameState && localPlayer && (
        <HostControlModal
          gameState={gameState}
          hostId={localPlayer.id}
          isOpen={hostModalOpen}
          onClose={() => setHostModalOpen(false)}
          onStartHand={() => hostStartGame(localPlayer.id)}
          onAdjustStack={(targetPlayerId, delta, reason) =>
            hostAdjustStack(localPlayer.id, targetPlayerId, delta, reason)
          }
          onKickPlayer={(targetPlayerId) => hostKickPlayer(localPlayer.id, targetPlayerId)}
          onUpdateSettings={(settings) => hostUpdateSettings(localPlayer.id, settings)}
        />
      )}

      {/* LEDGER DRAWER */}
      {gameState && (
        <LedgerDrawer
          isOpen={ledgerOpen}
          onClose={() => setLedgerOpen(false)}
          transactions={gameState.history}
        />
      )}

      {/* CASHOUT / DEBT SETTLEMENT */}
      <CashoutSummary
        isOpen={cashoutOpen}
        onClose={() => setCashoutOpen(false)}
        onFetchSettlement={getSettlement}
      />

      {/* QR CODE MODAL */}
      <QRModal isOpen={qrOpen} onClose={() => setQrOpen(false)} roomCode={roomCode} />

      {/* TOP UP MODAL */}
      <TopUpModal
        isOpen={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        currentStack={localPlayer?.stack ?? 0}
        playerName={localPlayer?.name ?? 'Bạn'}
        onConfirm={handleTopUp}
      />
    </div>
  );
}
