import { TableEngine } from './TableEngine';
import { RoomSettings } from './types';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, TableEngine> = new Map(); // key: roomCode
  private roomsById: Map<string, TableEngine> = new Map(); // key: roomId

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public createRoom(params: {
    roomName: string;
    hostName: string;
    hostId: string;
    sessionToken: string;
    socketId: string;
    pin?: string;
    settings?: Partial<RoomSettings>;
  }): { room: TableEngine; roomCode: string } {
    let roomCode = this.generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = this.generateRoomCode();
    }

    const room = new TableEngine({
      roomCode,
      roomName: params.roomName || `Bàn chơi #${roomCode}`,
      hostId: params.hostId,
      pin: params.pin,
      settings: params.settings,
    });

    // Add host as player 1
    room.addPlayer({
      id: params.hostId,
      name: params.hostName,
      sessionToken: params.sessionToken,
      socketId: params.socketId,
      isHost: true,
      avatar: 'avatar-1',
    });

    this.rooms.set(roomCode, room);
    this.roomsById.set(room.roomId, room);

    return { room, roomCode };
  }

  public getRoomByCode(code: string): TableEngine | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public getRoomById(id: string): TableEngine | undefined {
    return this.roomsById.get(id);
  }

  public getAllRooms(): TableEngine[] {
    return Array.from(this.rooms.values());
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
