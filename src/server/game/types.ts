export type PlayerActionType = 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'FOLD' | 'ALL_IN';

export type GamePhase =
  | 'LOBBY'
  | 'PRE_FLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'FINISHED'
  | 'PAUSED';

export type RuleVariant = 'POKER' | 'SIMPLE_BET';

export type DealerRule = 'WINNER_DEALS' | 'CLOCKWISE';

export interface RoomSettings {
  startingStack: number;
  tienGa: number; // Tiền gà đầu game (5, 10, 20)
  smallBlind: number;
  bigBlind: number;
  ante: number;
  minBet: number;
  allowAllIn: boolean;
  turnTimeoutSec: number;
  ruleVariant: RuleVariant;
  dealerRule: DealerRule;
  maxPlayers: number;
}

export interface Player {
  id: string;
  name: string;
  seatNumber: number; // 1 to 6
  avatar: string;
  sessionToken: string;
  socketId: string | null;
  connected: boolean;
  isHost: boolean;
  
  // 3-Tier Chip Model
  wallet: number;        // Total chip balance overall
  stack: number;         // Current in-play stack on the table
  currentRoundBet: number; // Chip put into the current betting round
  totalHandBet: number;  // Total chips committed in this entire hand
  
  // Hand Status
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
  lastAction?: {
    type: PlayerActionType | 'POST_BLIND' | 'POST_ANTE';
    amount?: number;
    timestamp: number;
  };
}

export interface Pot {
  id: string;
  name: string; // "Hũ chính" (Main Pot) or "Hũ phụ #1" (Side Pot 1)
  amount: number;
  eligiblePlayerIds: string[];
  winners?: string[];
  splitAmountPerWinner?: number;
}

export type TransactionType =
  | 'BUY_IN'
  | 'ANTE'
  | 'SMALL_BLIND'
  | 'BIG_BLIND'
  | 'BET'
  | 'CALL'
  | 'RAISE'
  | 'ALL_IN'
  | 'FOLD'
  | 'WIN_POT'
  | 'REBUY'
  | 'ADMIN_ADJUST';

export interface Transaction {
  id: string;
  timestamp: number;
  roundNumber: number;
  playerId: string;
  playerName: string;
  type: TransactionType;
  amount: number;
  stackBefore: number;
  stackAfter: number;
  reason?: string;
  idempotencyKey?: string;
}

export interface DebtSettlement {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  amount: number;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  roomName: string;
  hostId: string;
  pin?: string;
  settings: RoomSettings;
  players: Player[];
  phase: GamePhase;
  roundNumber: number;
  dealerIndex: number;
  currentTurnPlayerId: string | null;
  currentHighBet: number;
  minRaiseAmount: number;
  totalPot: number;
  pots: Pot[];
  turnTimeRemaining: number;
  history: Transaction[];
  lastActionSummary?: string;
}

export interface ClientActionPayload {
  roomId: string;
  playerId: string;
  action: PlayerActionType;
  amount?: number;
  idempotencyKey?: string;
}
