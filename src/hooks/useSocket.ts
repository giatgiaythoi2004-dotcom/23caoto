'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, ClientActionPayload, RoomSettings, DebtSettlement } from '@/server/game/types';
import { sound } from '@/lib/soundFX';

export function useSocket(roomCode?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastAnnouncement, setLastAnnouncement] = useState<string>('');
  const prevTurnPlayerId = useRef<string | null>(null);

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);

      if (roomCode && typeof window !== 'undefined') {
        const storedPlayerId = localStorage.getItem(`player_${roomCode}`);
        const storedToken = localStorage.getItem(`token_${roomCode}`);
        if (storedPlayerId && storedToken) {
          socket.emit(
            'room:reconnect',
            { roomCode, playerId: storedPlayerId, sessionToken: storedToken },
            (res: any) => {
              if (res?.success && res.state) {
                setGameState(res.state);
              } else {
                // Stale credentials must not leave the page stuck on a player
                // that the server no longer recognizes.
                localStorage.removeItem(`player_${roomCode}`);
                localStorage.removeItem(`token_${roomCode}`);
                window.dispatchEvent(new CustomEvent('casino:reconnect-failed'));
              }
            }
          );
        }
      }
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('game:state', (state: GameState) => {
      setGameState(state);
      if (typeof window !== 'undefined' && roomCode) {
        const myPlayerId = localStorage.getItem(`player_${roomCode}`);
        if (myPlayerId && state.currentTurnPlayerId === myPlayerId && prevTurnPlayerId.current !== myPlayerId) {
          sound.playTurn();
        }
        prevTurnPlayerId.current = state.currentTurnPlayerId;
      }
      if (state.phase === 'FINISHED') sound.playWin();
    });

    socket.on('game:announcement', (data: { message: string }) => {
      setLastAnnouncement(data.message);
    });

    return () => { socket.disconnect(); };
  }, [roomCode]);

  const createRoom = useCallback(
    (data: { roomName: string; hostName: string; pin?: string; settings?: Partial<RoomSettings>; customStack?: number; }, callback: (res: any) => void) => {
      if (!socketRef.current) return;
      socketRef.current.emit('room:create', data, (res: any) => {
        if (res.success && typeof window !== 'undefined') {
          localStorage.setItem(`player_${res.roomCode}`, res.playerId);
          localStorage.setItem(`token_${res.roomCode}`, res.sessionToken);
        }
        callback(res);
      });
    }, []
  );

  const joinRoom = useCallback(
    (data: { roomCode: string; playerName: string; pin?: string; customStack?: number; }, callback: (res: any) => void) => {
      if (!socketRef.current) return;
      socketRef.current.emit('room:join', data, (res: any) => {
        if (res.success && typeof window !== 'undefined') {
          localStorage.setItem(`player_${data.roomCode.toUpperCase()}`, res.playerId);
          localStorage.setItem(`token_${data.roomCode.toUpperCase()}`, res.sessionToken);
        }
        callback(res);
      });
    }, []
  );

  const sendAction = useCallback((payload: ClientActionPayload, callback?: (res: any) => void) => {
    if (!socketRef.current) return;
    sound.playChip();
    socketRef.current.emit('game:action', payload, callback);
  }, []);

  const topUpChips = useCallback(
    (playerId: string, amount: number, reason?: string, callback?: (res: any) => void) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit('player:topup', { roomCode, playerId, amount, reason }, callback);
    }, [roomCode]
  );

  const hostStartGame = useCallback((hostId: string, callback?: (res: any) => void) => {
    if (!socketRef.current || !roomCode) return;
    socketRef.current.emit('host:start_game', { roomCode, hostId }, callback);
  }, [roomCode]);

  const hostShowdownWinner = useCallback(
    (hostId: string, payouts: { potId: string; winnerIds: string[] }[], callback?: (res: any) => void) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit('host:showdown_winner', { roomCode, hostId, payouts }, callback);
    }, [roomCode]
  );

  const hostAdjustStack = useCallback(
    (hostId: string, targetPlayerId: string, delta: number, reason: string, callback?: (res: any) => void) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit('host:adjust_stack', { roomCode, hostId, targetPlayerId, delta, reason }, callback);
    }, [roomCode]
  );

  const hostKickPlayer = useCallback(
    (hostId: string, targetPlayerId: string, callback?: (res: any) => void) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit('host:kick_player', { roomCode, hostId, targetPlayerId }, callback);
    }, [roomCode]
  );

  const hostUpdateSettings = useCallback(
    (hostId: string, settings: Partial<RoomSettings>, callback?: (res: any) => void) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit('host:update_settings', { roomCode, hostId, settings }, callback);
    }, [roomCode]
  );

  const getSettlement = useCallback(
    (callback: (res: any) => void) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit('room:get_settlement', { roomCode }, callback);
    }, [roomCode]
  );

  return {
    socket: socketRef.current,
    gameState,
    isConnected,
    lastAnnouncement,
    createRoom,
    joinRoom,
    sendAction,
    topUpChips,
    hostStartGame,
    hostShowdownWinner,
    hostAdjustStack,
    hostKickPlayer,
    hostUpdateSettings,
    getSettlement,
  };
}
