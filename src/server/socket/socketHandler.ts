import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager';
import { ClientActionPayload, RoomSettings } from '../game/types';
import { calculateDebtSettlement } from '../game/DebtSimplifier';
import { v4 as uuidv4 } from 'uuid';

export function setupSocketHandlers(io: SocketIOServer) {
  const roomManager = RoomManager.getInstance();

  io.on('connection', (socket: Socket) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    // --------------------------------------------------
    // CREATE ROOM
    // --------------------------------------------------
    socket.on(
      'room:create',
      (
        data: {
          roomName: string;
          hostName: string;
          pin?: string;
          settings?: Partial<RoomSettings>;
          sessionToken?: string;
        },
        callback: (res: { success: boolean; roomCode?: string; playerId?: string; sessionToken?: string; error?: string }) => void
      ) => {
        try {
          const playerId = uuidv4();
          const sessionToken = data.sessionToken || uuidv4();

          const { room, roomCode } = roomManager.createRoom({
            roomName: data.roomName || 'Bàn Casino VIP',
            hostName: data.hostName || 'Chủ bàn',
            hostId: playerId,
            sessionToken,
            socketId: socket.id,
            pin: data.pin,
            settings: data.settings,
          });

          currentRoomCode = roomCode;
          currentPlayerId = playerId;
          socket.join(roomCode);

          if (callback) {
            callback({
              success: true,
              roomCode,
              playerId,
              sessionToken,
            });
          }

          io.to(roomCode).emit('game:state', room.getState());
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // JOIN ROOM
    // --------------------------------------------------
    socket.on(
      'room:join',
      (
        data: {
          roomCode: string;
          playerName: string;
          pin?: string;
          sessionToken?: string;
          playerId?: string;
          customStack?: number;
        },
        callback: (res: { success: boolean; playerId?: string; sessionToken?: string; error?: string }) => void
      ) => {
        try {
          const room = roomManager.getRoomByCode(data.roomCode);
          if (!room) {
            if (callback) callback({ success: false, error: 'Không tìm thấy phòng chơi này!' });
            return;
          }

          if (room.pin && room.pin !== data.pin) {
            if (callback) callback({ success: false, error: 'Mã PIN của phòng không chính xác!' });
            return;
          }

          const sessionToken = data.sessionToken || uuidv4();
          const playerId = data.playerId || uuidv4();

          const player = room.addPlayer({
            id: playerId,
            name: data.playerName || 'Người chơi',
            sessionToken,
            socketId: socket.id,
            customStack: data.customStack,
          });

          currentRoomCode = room.roomCode;
          currentPlayerId = player.id;
          socket.join(room.roomCode);

          if (callback) {
            callback({
              success: true,
              playerId: player.id,
              sessionToken: player.sessionToken,
            });
          }

          io.to(room.roomCode).emit('game:state', room.getState());
          io.to(room.roomCode).emit('game:announcement', {
            message: `👋 ${player.name} đã tham gia bàn cược (Ghế số ${player.seatNumber}).`,
          });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // RECONNECT TO ROOM
    // --------------------------------------------------
    socket.on(
      'room:reconnect',
      (
        data: { roomCode: string; playerId: string; sessionToken: string },
        callback: (res: { success: boolean; state?: any; error?: string }) => void
      ) => {
        const room = roomManager.getRoomByCode(data.roomCode);
        if (!room) {
          if (callback) callback({ success: false, error: 'Phòng không tồn tại!' });
          return;
        }

        const player = room.players.find(
          p => p.id === data.playerId || p.sessionToken === data.sessionToken
        );

        if (!player) {
          if (callback) callback({ success: false, error: 'Không tìm thấy phiên người chơi!' });
          return;
        }

        player.connected = true;
        player.socketId = socket.id;
        currentRoomCode = room.roomCode;
        currentPlayerId = player.id;
        socket.join(room.roomCode);

        if (callback) {
          callback({
            success: true,
            state: room.getState(),
          });
        }

        io.to(room.roomCode).emit('game:state', room.getState());
      }
    );

    // --------------------------------------------------
    // PLAYER BETTING ACTION
    // --------------------------------------------------
    socket.on(
      'game:action',
      (
        payload: ClientActionPayload,
        callback: (res: { success: boolean; error?: string }) => void
      ) => {
        try {
          const room = roomManager.getRoomByCode(payload.roomId) || roomManager.getRoomById(payload.roomId);
          if (!room) {
            if (callback) callback({ success: false, error: 'Bàn chơi không tồn tại!' });
            return;
          }

          room.playerAction(payload);

          if (callback) callback({ success: true });

          io.to(room.roomCode).emit('game:state', room.getState());
          io.to(room.roomCode).emit('game:announcement', {
            message: room.lastActionSummary,
          });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // HOST: START HAND / NEXT HAND
    // --------------------------------------------------
    socket.on(
      'host:start_game',
      (
        data: { roomCode: string; hostId: string },
        callback: (res: { success: boolean; error?: string }) => void
      ) => {
        try {
          const room = roomManager.getRoomByCode(data.roomCode);
          if (!room) throw new Error('Phòng không tồn tại!');
          if (room.hostId !== data.hostId) throw new Error('Chỉ có Chủ bàn (Host) mới có quyền bắt đầu ván!');

          room.startHand();

          if (callback) callback({ success: true });

          io.to(room.roomCode).emit('game:state', room.getState());
          io.to(room.roomCode).emit('game:announcement', {
            message: `🚀 Ván #${room.roundNumber} đã bắt đầu!`,
          });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // HOST: SHOWDOWN WINNERS CONFIRMATION
    // --------------------------------------------------
    socket.on(
      'host:showdown_winner',
      (
        data: {
          roomCode: string;
          hostId: string;
          payouts: { potId: string; winnerIds: string[] }[];
        },
        callback: (res: { success: boolean; error?: string }) => void
      ) => {
        try {
          const room = roomManager.getRoomByCode(data.roomCode);
          if (!room) throw new Error('Phòng không tồn tại!');
          if (room.hostId !== data.hostId) throw new Error('Chỉ có Chủ bàn mới có quyền xác nhận người thắng!');

          room.resolveShowdownWinners(data.payouts);

          if (callback) callback({ success: true });

          io.to(room.roomCode).emit('game:state', room.getState());
          io.to(room.roomCode).emit('game:announcement', {
            message: room.lastActionSummary,
          });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // HOST: ADJUST PLAYER STACK (REBUY / CORRECTION)
    // --------------------------------------------------
    socket.on(
      'host:adjust_stack',
      (
        data: {
          roomCode: string;
          hostId: string;
          targetPlayerId: string;
          delta: number;
          reason: string;
        },
        callback: (res: { success: boolean; error?: string }) => void
      ) => {
        try {
          const room = roomManager.getRoomByCode(data.roomCode);
          if (!room) throw new Error('Phòng không tồn tại!');
          if (room.hostId !== data.hostId) throw new Error('Chỉ có Host mới có quyền điều chỉnh chip!');

          room.adjustPlayerStack({
            playerId: data.targetPlayerId,
            amountDelta: data.delta,
            reason: data.reason || 'Host điều chỉnh',
            adminId: data.hostId,
          });

          if (callback) callback({ success: true });

          io.to(room.roomCode).emit('game:state', room.getState());
          io.to(room.roomCode).emit('game:announcement', {
            message: room.lastActionSummary,
          });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // PLAYER: TOP-UP / REBUY CHIPS (NẠP THÊM CHIP)
    // --------------------------------------------------
    socket.on(
      'player:topup',
      (
        data: {
          roomCode: string;
          playerId: string;
          amount: number;
          reason?: string;
        },
        callback: (res: { success: boolean; error?: string }) => void
      ) => {
        try {
          const room = roomManager.getRoomByCode(data.roomCode);
          if (!room) throw new Error('Phòng không tồn tại!');

          room.playerTopUp({
            playerId: data.playerId,
            amount: data.amount,
            reason: data.reason || 'Nạp thêm chip',
          });

          if (callback) callback({ success: true });

          io.to(room.roomCode).emit('game:state', room.getState());
          io.to(room.roomCode).emit('game:announcement', {
            message: room.lastActionSummary,
          });
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // HOST: KICK PLAYER
    // --------------------------------------------------
    socket.on(
      'host:kick_player',
      (
        data: { roomCode: string; hostId: string; targetPlayerId: string },
        callback: (res: { success: boolean; error?: string }) => void
      ) => {
        try {
          const room = roomManager.getRoomByCode(data.roomCode);
          if (!room) throw new Error('Phòng không tồn tại!');
          if (room.hostId !== data.hostId) throw new Error('Chỉ có Host mới có quyền mời rời bàn!');

          room.removePlayer(data.targetPlayerId);

          if (callback) callback({ success: true });

          io.to(room.roomCode).emit('game:state', room.getState());
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // HOST: UPDATE SETTINGS
    // --------------------------------------------------
    socket.on(
      'host:update_settings',
      (
        data: { roomCode: string; hostId: string; settings: Partial<RoomSettings> },
        callback: (res: { success: boolean; error?: string }) => void
      ) => {
        try {
          const room = roomManager.getRoomByCode(data.roomCode);
          if (!room) throw new Error('Phòng không tồn tại!');
          if (room.hostId !== data.hostId) throw new Error('Chỉ có Host mới có quyền đổi cài đặt!');

          room.updateSettings(data.settings);

          if (callback) callback({ success: true });

          io.to(room.roomCode).emit('game:state', room.getState());
        } catch (err: any) {
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    // --------------------------------------------------
    // GET DEBT SETTLEMENT & SUMMARY
    // --------------------------------------------------
    socket.on(
      'room:get_settlement',
      (
        data: { roomCode: string },
        callback: (res: { success: boolean; settlement?: any; error?: string }) => void
      ) => {
        const room = roomManager.getRoomByCode(data.roomCode);
        if (!room) {
          if (callback) callback({ success: false, error: 'Phòng không tồn tại!' });
          return;
        }

        const summary = calculateDebtSettlement(room.players, room.settings.startingStack);
        if (callback) callback({ success: true, settlement: summary });
      }
    );

    // --------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------
    socket.on('disconnect', () => {
      if (currentRoomCode) {
        const room = roomManager.getRoomByCode(currentRoomCode);
        if (room) {
          room.setPlayerDisconnected(socket.id);
          io.to(room.roomCode).emit('game:state', room.getState());
        }
      }
    });
  });
}
