import {
  ClientActionPayload,
  GamePhase,
  GameState,
  Player,
  PlayerActionType,
  Pot,
  RoomSettings,
} from './types';
import { LedgerService } from './LedgerService';
import { v4 as uuidv4 } from 'uuid';

export class TableEngine {
  public roomId: string;
  public roomCode: string;
  public roomName: string;
  public hostId: string;
  public pin?: string;
  public settings: RoomSettings;
  public players: Player[] = [];
  public phase: GamePhase = 'LOBBY';
  public roundNumber: number = 0;
  public dealerIndex: number = 0;
  public currentTurnPlayerId: string | null = null;
  public currentHighBet: number = 0;
  public minRaiseAmount: number = 0;
  public totalPot: number = 0;
  public pots: Pot[] = [];
  // Kept in the state shape for backwards compatibility with connected clients.
  // A value of 0 means that turns have no deadline.
  public turnTimeRemaining: number = 0;
  public lastActionSummary: string = 'Phòng mới tạo. Chờ người chơi tham gia.';
  public lastHandWinnerId: string | null = null;
  public ledger: LedgerService;

  // Track who has acted in the current betting round
  private actedThisRound: Set<string> = new Set();

  constructor(params: {
    roomId?: string;
    roomCode: string;
    roomName: string;
    hostId: string;
    pin?: string;
    settings?: Partial<RoomSettings>;
  }) {
    this.roomId = params.roomId || uuidv4();
    this.roomCode = params.roomCode.toUpperCase();
    this.roomName = params.roomName;
    this.hostId = params.hostId;
    this.pin = params.pin;
    this.ledger = new LedgerService();

    const startingStack = params.settings?.startingStack ?? 200;
    const tienGa = params.settings?.tienGa ?? (params.settings?.ante ?? 10);
    const minBet = params.settings?.minBet ?? 5;

    this.settings = {
      startingStack,
      tienGa,
      smallBlind: params.settings?.smallBlind ?? 0,
      bigBlind: params.settings?.bigBlind ?? 10,
      ante: tienGa,
      minBet,
      allowAllIn: params.settings?.allowAllIn ?? true,
      // Turn deadlines are intentionally disabled; retain the setting only for
      // compatibility with older clients/configuration payloads.
      turnTimeoutSec: 0,
      ruleVariant: params.settings?.ruleVariant ?? 'SIMPLE_BET',
      dealerRule: params.settings?.dealerRule ?? 'WINNER_DEALS',
      maxPlayers: 6,
    };
  }

  // ----------------------------------------------------
  // PLAYER MANAGEMENT
  // ----------------------------------------------------
  public addPlayer(params: {
    id: string;
    name: string;
    sessionToken: string;
    socketId: string;
    isHost?: boolean;
    avatar?: string;
    customStack?: number;
  }): Player {
    // Check if player reconnecting
    const existing = this.players.find(p => p.id === params.id || p.sessionToken === params.sessionToken);
    if (existing) {
      existing.connected = true;
      existing.socketId = params.socketId;
      existing.name = params.name || existing.name;
      return existing;
    }

    if (this.players.length >= this.settings.maxPlayers) {
      throw new Error('Bàn đã đủ 6 người chơi!');
    }

    // Assign lowest available seat 1..6
    const takenSeats = new Set(this.players.map(p => p.seatNumber));
    let seat = 1;
    while (takenSeats.has(seat) && seat <= 6) seat++;

    const initialChip = params.customStack && params.customStack > 0
      ? params.customStack
      : this.settings.startingStack;

    const newPlayer: Player = {
      id: params.id,
      name: params.name,
      seatNumber: seat,
      avatar: params.avatar || `avatar-${seat}`,
      sessionToken: params.sessionToken,
      socketId: params.socketId,
      connected: true,
      isHost: params.isHost ?? (this.players.length === 0),
      wallet: initialChip,
      stack: initialChip,
      currentRoundBet: 0,
      totalHandBet: 0,
      folded: false,
      allIn: false,
      sittingOut: false,
    };

    this.players.push(newPlayer);

    // Record initial buy-in
    this.ledger.recordTransaction({
      roundNumber: this.roundNumber,
      playerId: newPlayer.id,
      playerName: newPlayer.name,
      type: 'BUY_IN',
      amount: newPlayer.stack,
      stackBefore: 0,
      stackAfter: newPlayer.stack,
      reason: `Mang ${initialChip} chip vào bàn`,
    });

    return newPlayer;
  }

  public removePlayer(playerId: string): void {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx !== -1) {
      const p = this.players[idx];
      // If currently active in a hand, fold them first
      if (this.phase !== 'LOBBY' && this.phase !== 'FINISHED' && !p.folded) {
        this.playerAction({ roomId: this.roomId, playerId: p.id, action: 'FOLD' });
      }
      this.players.splice(idx, 1);
      
      // If host left, assign host to first player
      if (p.isHost && this.players.length > 0) {
        this.players[0].isHost = true;
        this.hostId = this.players[0].id;
      }
    }
  }

  public setPlayerDisconnected(socketId: string): void {
    const player = this.players.find(p => p.socketId === socketId);
    if (player) {
      player.connected = false;
      player.socketId = null;
    }
  }

  // ----------------------------------------------------
  // GAME FLOW & ROUNDS
  // ----------------------------------------------------
  public startHand(): void {
    const activePlayers = this.players.filter(p => !p.sittingOut && p.stack > 0);
    if (activePlayers.length < 2) {
      throw new Error('Cần tối thiểu 2 người chơi có chip để bắt đầu ván!');
    }

    this.roundNumber++;
    this.phase = this.settings.ruleVariant === 'POKER' ? 'PRE_FLOP' : 'PRE_FLOP';
    this.pots = [];
    this.totalPot = 0;
    this.currentHighBet = 0;
    this.minRaiseAmount = Math.max(this.settings.bigBlind, this.settings.minBet, 1);
    this.actedThisRound.clear();

    // Reset player state for new hand
    for (const p of this.players) {
      p.currentRoundBet = 0;
      p.totalHandBet = 0;
      p.folded = p.sittingOut || p.stack <= 0;
      p.allIn = false;
      delete p.lastAction;
    }

    // Determine Dealer button:
    // If WINNER_DEALS rule is active and we have a previous winner, that winner becomes Dealer
    if (this.settings.dealerRule === 'WINNER_DEALS' && this.lastHandWinnerId) {
      const winnerIndex = this.players.findIndex(p => p.id === this.lastHandWinnerId);
      if (winnerIndex !== -1 && !this.players[winnerIndex].sittingOut && this.players[winnerIndex].stack > 0) {
        this.dealerIndex = winnerIndex;
      } else {
        // Fallback clockwise if winner left or is out of chips
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        while (this.players[this.dealerIndex].folded || this.players[this.dealerIndex].sittingOut) {
          this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        }
      }
    } else {
      // Standard clockwise progression
      this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
      while (this.players[this.dealerIndex].folded || this.players[this.dealerIndex].sittingOut) {
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
      }
    }

    // Post Ante if configured
    if (this.settings.ante > 0) {
      for (const p of this.players) {
        if (!p.folded) {
          const anteAmount = Math.min(p.stack, this.settings.ante);
          p.stack -= anteAmount;
          p.currentRoundBet += anteAmount;
          p.totalHandBet += anteAmount;
          this.totalPot += anteAmount;
          if (p.stack === 0) p.allIn = true;

          this.ledger.recordTransaction({
            roundNumber: this.roundNumber,
            playerId: p.id,
            playerName: p.name,
            type: 'ANTE',
            amount: anteAmount,
            stackBefore: p.stack + anteAmount,
            stackAfter: p.stack,
            reason: 'Đóng tiền Ante đầu ván',
          });
        }
      }
    }

    // Ante is part of the current betting round.  In SIMPLE_BET there are no
    // blinds to set this value later, so initialize the high bet here as well.
    // Without this, every player starts with (for example) 10 chips committed
    // while currentHighBet stays at 0; a raise from the second player then has
    // a zero delta and is incorrectly rejected.
    this.currentHighBet = Math.max(
      0,
      ...this.players.filter(p => !p.folded).map(p => p.currentRoundBet)
    );

    // Post Blinds (Poker rules)
    const active = this.getActivePlayersInHand();
    if (this.settings.ruleVariant === 'POKER' && active.length >= 2) {
      // Find SB and BB seats
      let sbIndex = (this.dealerIndex + 1) % this.players.length;
      while (this.players[sbIndex].folded) sbIndex = (sbIndex + 1) % this.players.length;

      let bbIndex = (sbIndex + 1) % this.players.length;
      while (this.players[bbIndex].folded) bbIndex = (bbIndex + 1) % this.players.length;

      const sbPlayer = this.players[sbIndex];
      const bbPlayer = this.players[bbIndex];

      // Deduct SB
      const sbAmount = Math.min(sbPlayer.stack, this.settings.smallBlind);
      sbPlayer.stack -= sbAmount;
      sbPlayer.currentRoundBet += sbAmount;
      sbPlayer.totalHandBet += sbAmount;
      this.totalPot += sbAmount;
      if (sbPlayer.stack === 0) sbPlayer.allIn = true;
      sbPlayer.lastAction = { type: 'POST_BLIND', amount: sbAmount, timestamp: Date.now() };

      this.ledger.recordTransaction({
        roundNumber: this.roundNumber,
        playerId: sbPlayer.id,
        playerName: sbPlayer.name,
        type: 'SMALL_BLIND',
        amount: sbAmount,
        stackBefore: sbPlayer.stack + sbAmount,
        stackAfter: sbPlayer.stack,
        reason: 'Đóng cược mù nhỏ (Small Blind)',
      });

      // Deduct BB
      const bbAmount = Math.min(bbPlayer.stack, this.settings.bigBlind);
      bbPlayer.stack -= bbAmount;
      bbPlayer.currentRoundBet += bbAmount;
      bbPlayer.totalHandBet += bbAmount;
      this.totalPot += bbAmount;
      if (bbPlayer.stack === 0) bbPlayer.allIn = true;
      bbPlayer.lastAction = { type: 'POST_BLIND', amount: bbAmount, timestamp: Date.now() };

      this.ledger.recordTransaction({
        roundNumber: this.roundNumber,
        playerId: bbPlayer.id,
        playerName: bbPlayer.name,
        type: 'BIG_BLIND',
        amount: bbAmount,
        stackBefore: bbPlayer.stack + bbAmount,
        stackAfter: bbPlayer.stack,
        reason: 'Đóng cược mù lớn (Big Blind)',
      });

      this.currentHighBet = Math.max(sbPlayer.currentRoundBet, bbPlayer.currentRoundBet);

      // Determine who acts first:
      if (this.settings.dealerRule === 'WINNER_DEALS') {
        // Winner / Dealer acts first
        let firstTurnIndex = this.dealerIndex;
        while (this.players[firstTurnIndex].folded || this.players[firstTurnIndex].allIn) {
          firstTurnIndex = (firstTurnIndex + 1) % this.players.length;
        }
        this.currentTurnPlayerId = this.players[firstTurnIndex].id;
      } else {
        // Standard Poker pre-flop: UTG (after BB)
        let firstTurnIndex = (bbIndex + 1) % this.players.length;
        while (this.players[firstTurnIndex].folded || this.players[firstTurnIndex].allIn) {
          firstTurnIndex = (firstTurnIndex + 1) % this.players.length;
        }
        this.currentTurnPlayerId = this.players[firstTurnIndex].id;
      }
    } else {
      // Simple Bet: Winner / Dealer acts first if WINNER_DEALS, otherwise Dealer + 1
      let firstTurnIndex = this.settings.dealerRule === 'WINNER_DEALS'
        ? this.dealerIndex
        : (this.dealerIndex + 1) % this.players.length;
      while (this.players[firstTurnIndex].folded || this.players[firstTurnIndex].allIn) {
        firstTurnIndex = (firstTurnIndex + 1) % this.players.length;
      }
      this.currentTurnPlayerId = this.players[firstTurnIndex].id;
    }

    this.lastActionSummary = `Ván #${this.roundNumber} bắt đầu. Lượt của ${this.getCurrentTurnPlayer()?.name}.`;
  }

  // ----------------------------------------------------
  // PLAYER ACTIONS
  // ----------------------------------------------------
  public playerAction(payload: ClientActionPayload): void {
    if (this.phase === 'LOBBY' || this.phase === 'SHOWDOWN' || this.phase === 'FINISHED' || this.phase === 'PAUSED') {
      throw new Error('Ván chơi không ở trạng thái nhận cược!');
    }

    if (this.currentTurnPlayerId !== payload.playerId) {
      throw new Error('Chưa đến lượt của bạn!');
    }

    const player = this.players.find(p => p.id === payload.playerId);
    if (!player || player.folded || player.allIn) {
      throw new Error('Người chơi không thể thực hiện hành động này!');
    }

    const currentRoundBet = player.currentRoundBet;
    const callAmount = this.currentHighBet - currentRoundBet;

    switch (payload.action) {
      case 'FOLD': {
        player.folded = true;
        player.lastAction = { type: 'FOLD', timestamp: Date.now() };
        this.lastActionSummary = `${player.name} đã Úp bài (Fold).`;

        this.ledger.recordTransaction({
          roundNumber: this.roundNumber,
          playerId: player.id,
          playerName: player.name,
          type: 'FOLD',
          amount: 0,
          stackBefore: player.stack,
          stackAfter: player.stack,
          reason: 'Người chơi bỏ ván',
          idempotencyKey: payload.idempotencyKey,
        });

        // Check if only 1 player remains!
        const remaining = this.players.filter(p => !p.folded);
        if (remaining.length === 1) {
          this.awardPotToLastStanding(remaining[0]);
          return;
        }
        break;
      }

      case 'CHECK': {
        if (callAmount > 0) {
          throw new Error(`Không thể Check! Cần theo thêm ${callAmount} chip.`);
        }
        player.lastAction = { type: 'CHECK', timestamp: Date.now() };
        this.lastActionSummary = `${player.name} Xem (Check).`;
        break;
      }

      case 'CALL': {
        if (callAmount <= 0) {
          // Effectively a check
          player.lastAction = { type: 'CHECK', timestamp: Date.now() };
          this.lastActionSummary = `${player.name} Xem (Check).`;
        } else {
          const actualCall = Math.min(callAmount, player.stack);
          player.stack -= actualCall;
          player.currentRoundBet += actualCall;
          player.totalHandBet += actualCall;
          this.totalPot += actualCall;
          if (player.stack === 0) player.allIn = true;

          player.lastAction = { type: player.allIn ? 'ALL_IN' : 'CALL', amount: actualCall, timestamp: Date.now() };
          this.lastActionSummary = `${player.name} Theo ${actualCall} chip${player.allIn ? ' (Tất tay!)' : ''}.`;

          this.ledger.recordTransaction({
            roundNumber: this.roundNumber,
            playerId: player.id,
            playerName: player.name,
            type: player.allIn ? 'ALL_IN' : 'CALL',
            amount: actualCall,
            stackBefore: player.stack + actualCall,
            stackAfter: player.stack,
            reason: player.allIn ? 'Tất tay theo cược' : 'Theo cược',
            idempotencyKey: payload.idempotencyKey,
          });
        }
        break;
      }

      case 'BET':
      case 'RAISE': {
        const raiseAmount = payload.amount ?? (this.currentHighBet + this.minRaiseAmount);
        // Target bet must be at least currentHighBet + minRaise, unless going all-in
        const minTargetBet = this.currentHighBet + this.minRaiseAmount;
        
        if (raiseAmount < minTargetBet && raiseAmount - currentRoundBet < player.stack) {
          throw new Error(`Mức cược tối thiểu phải là ${minTargetBet} chip!`);
        }

        const delta = raiseAmount - currentRoundBet;
        if (delta <= 0) {
          throw new Error('Số chip tố phải lớn hơn mức cược hiện tại!');
        }

        const actualChips = Math.min(delta, player.stack);
        player.stack -= actualChips;
        player.currentRoundBet += actualChips;
        player.totalHandBet += actualChips;
        this.totalPot += actualChips;

        const raiseDelta = player.currentRoundBet - this.currentHighBet;
        if (raiseDelta > this.minRaiseAmount) {
          this.minRaiseAmount = raiseDelta;
        }
        this.currentHighBet = player.currentRoundBet;

        if (player.stack === 0) player.allIn = true;

        player.lastAction = {
          type: player.allIn ? 'ALL_IN' : 'RAISE',
          amount: player.currentRoundBet,
          timestamp: Date.now(),
        };

        this.lastActionSummary = `${player.name} Tố lên ${player.currentRoundBet} chip${player.allIn ? ' (Tất tay!)' : ''}.`;

        this.ledger.recordTransaction({
          roundNumber: this.roundNumber,
          playerId: player.id,
          playerName: player.name,
          type: player.allIn ? 'ALL_IN' : 'RAISE',
          amount: actualChips,
          stackBefore: player.stack + actualChips,
          stackAfter: player.stack,
          reason: player.allIn ? 'Tất tay tăng mức cược' : 'Tố cược',
          idempotencyKey: payload.idempotencyKey,
        });

        // When a raise happens, all OTHER active players must act again!
        this.actedThisRound.clear();
        break;
      }

      case 'ALL_IN': {
        if (!this.settings.allowAllIn) {
          throw new Error('Chế độ chơi này không cho phép All-in!');
        }
        const allInAmount = player.stack;
        if (allInAmount <= 0) throw new Error('Không còn chip để tất tay!');

        player.stack = 0;
        player.currentRoundBet += allInAmount;
        player.totalHandBet += allInAmount;
        this.totalPot += allInAmount;
        player.allIn = true;

        if (player.currentRoundBet > this.currentHighBet) {
          const delta = player.currentRoundBet - this.currentHighBet;
          if (delta > this.minRaiseAmount) this.minRaiseAmount = delta;
          this.currentHighBet = player.currentRoundBet;
          this.actedThisRound.clear(); // Others must react to higher bet
        }

        player.lastAction = { type: 'ALL_IN', amount: player.currentRoundBet, timestamp: Date.now() };
        this.lastActionSummary = `${player.name} ĐÃ TẤT TAY TOÀN BỘ ${allInAmount} CHIP!`;

        this.ledger.recordTransaction({
          roundNumber: this.roundNumber,
          playerId: player.id,
          playerName: player.name,
          type: 'ALL_IN',
          amount: allInAmount,
          stackBefore: allInAmount,
          stackAfter: 0,
          reason: 'Tất tay toàn bộ số chip',
          idempotencyKey: payload.idempotencyKey,
        });
        break;
      }
    }

    this.actedThisRound.add(player.id);
    this.checkBettingRoundStatus();
  }

  // ----------------------------------------------------
  // ROUND COMPLETION & SIDE POTS
  // ----------------------------------------------------
  private checkBettingRoundStatus(): void {
    const activeInHand = this.players.filter(p => !p.folded);
    const nonAllIn = activeInHand.filter(p => !p.allIn);

    // If only 1 or 0 non-all-in players remain and all bets match, go straight to showdown
    const allBetsMatch = activeInHand.every(
      p => p.allIn || p.currentRoundBet === this.currentHighBet
    );

    const allHaveActed = nonAllIn.every(p => this.actedThisRound.has(p.id));

    if (allBetsMatch && (allHaveActed || nonAllIn.length <= 1)) {
      this.advanceBettingRound();
    } else {
      this.advanceTurn();
    }
  }

  private advanceTurn(): void {
    const active = this.players.filter(p => !p.folded && !p.allIn);
    if (active.length === 0) {
      this.advanceBettingRound();
      return;
    }

    const currentIndex = this.players.findIndex(p => p.id === this.currentTurnPlayerId);
    let nextIndex = (currentIndex + 1) % this.players.length;

    while (this.players[nextIndex].folded || this.players[nextIndex].allIn) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }

    this.currentTurnPlayerId = this.players[nextIndex].id;
  }

  private advanceBettingRound(): void {
    this.calculatePots();

    // Reset round bets
    for (const p of this.players) {
      p.currentRoundBet = 0;
    }
    this.currentHighBet = 0;
    this.minRaiseAmount = Math.max(this.settings.bigBlind, this.settings.minBet, 1);
    this.actedThisRound.clear();

    const activeUnfolded = this.players.filter(p => !p.folded);
    const playersAbleToAct = activeUnfolded.filter(p => !p.allIn);

    // If 0 or 1 player able to act, advance straight to showdown!
    if (playersAbleToAct.length <= 1) {
      this.phase = 'SHOWDOWN';
      this.currentTurnPlayerId = null;
      this.lastActionSummary = 'Tất cả người chơi đã All-in hoặc cược xong. Chờ Host xác nhận người thắng ngoài đời!';
      return;
    }

    if (this.settings.ruleVariant === 'POKER') {
      switch (this.phase) {
        case 'PRE_FLOP':
          this.phase = 'FLOP';
          this.lastActionSummary = 'Vòng Flop bắt đầu.';
          break;
        case 'FLOP':
          this.phase = 'TURN';
          this.lastActionSummary = 'Vòng Turn bắt đầu.';
          break;
        case 'TURN':
          this.phase = 'RIVER';
          this.lastActionSummary = 'Vòng River bắt đầu.';
          break;
        case 'RIVER':
          this.phase = 'SHOWDOWN';
          this.currentTurnPlayerId = null;
          this.lastActionSummary = 'Hết các vòng cược. Mở bài (Showdown) - Host xác nhận người thắng!';
          return;
      }
    } else {
      // SIMPLE_BET single round or finished
      this.phase = 'SHOWDOWN';
      this.currentTurnPlayerId = null;
      this.lastActionSummary = 'Kết thúc vòng cược. Host xác nhận người thắng!';
      return;
    }

    // Set turn to first active player (Winner/Dealer acts first if WINNER_DEALS)
    let nextIndex = this.settings.dealerRule === 'WINNER_DEALS'
      ? this.dealerIndex
      : (this.dealerIndex + 1) % this.players.length;
    while (this.players[nextIndex].folded || this.players[nextIndex].allIn) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }
    this.currentTurnPlayerId = this.players[nextIndex].id;
  }

  // ----------------------------------------------------
  // POT & SIDE POT CALCULATION
  // ----------------------------------------------------
  public calculatePots(): void {
    // Collect all players' totalHandBet
    const contributors = this.players
      .filter(p => p.totalHandBet > 0)
      .map(p => ({
        id: p.id,
        name: p.name,
        totalBet: p.totalHandBet,
        folded: p.folded,
        allIn: p.allIn,
      }));

    if (contributors.length === 0) return;

    // Distinct bet levels
    const sortedLevels = Array.from(new Set(contributors.map(c => c.totalBet))).sort((a, b) => a - b);
    const newPots: Pot[] = [];
    let prevLevel = 0;

    for (let i = 0; i < sortedLevels.length; i++) {
      const currentLevel = sortedLevels[i];
      const slicePerPlayer = currentLevel - prevLevel;

      // Count contributors at or above this level
      const eligibleAtThisLevel = contributors.filter(c => c.totalBet >= currentLevel);
      const potAmount = eligibleAtThisLevel.length * slicePerPlayer;

      // Eligible winners: non-folded players who contributed to this level
      const eligibleWinners = eligibleAtThisLevel.filter(c => !c.folded).map(c => c.id);

      if (potAmount > 0) {
        newPots.push({
          id: `pot-${i + 1}`,
          name: i === 0 ? 'Hũ chính (Main Pot)' : `Hũ phụ #${i} (Side Pot)`,
          amount: potAmount,
          eligiblePlayerIds: eligibleWinners,
        });
      }

      prevLevel = currentLevel;
    }

    // Merge pots if eligible winners are identical
    const mergedPots: Pot[] = [];
    for (const p of newPots) {
      const prev = mergedPots[mergedPots.length - 1];
      if (
        prev &&
        prev.eligiblePlayerIds.length === p.eligiblePlayerIds.length &&
        prev.eligiblePlayerIds.every(id => p.eligiblePlayerIds.includes(id))
      ) {
        prev.amount += p.amount;
      } else {
        mergedPots.push(p);
      }
    }

    // Re-label
    mergedPots.forEach((pot, idx) => {
      pot.name = idx === 0 ? 'Hũ chính (Main Pot)' : `Hũ phụ #${idx} (Side Pot)`;
    });

    this.pots = mergedPots;
  }

  // ----------------------------------------------------
  // SHOWDOWN & WINNER SETTLEMENT
  // ----------------------------------------------------
  public awardPotToLastStanding(winner: Player): void {
    this.calculatePots();
    const wonAmount = this.totalPot;
    winner.stack += wonAmount;
    winner.wallet += wonAmount;

    this.ledger.recordTransaction({
      roundNumber: this.roundNumber,
      playerId: winner.id,
      playerName: winner.name,
      type: 'WIN_POT',
      amount: wonAmount,
      stackBefore: winner.stack - wonAmount,
      stackAfter: winner.stack,
      reason: 'Tất cả đối thủ đã Úp bài - Thắng toàn bộ Pot',
    });

    this.phase = 'FINISHED';
    this.currentTurnPlayerId = null;
    this.lastHandWinnerId = winner.id;
    this.lastActionSummary = `🏆 ${winner.name} thắng ${wonAmount} chip (tất cả đối thủ đã úp bài)!`;
  }

  public resolveShowdownWinners(payouts: { potId: string; winnerIds: string[] }[]): void {
    if (this.phase !== 'SHOWDOWN') {
      throw new Error('Chỉ có thể chia Pot khi đang ở giai đoạn Showdown!');
    }

    for (const payout of payouts) {
      const pot = this.pots.find(p => p.id === payout.potId);
      if (!pot) continue;
      if (payout.winnerIds.length === 0) continue;

      const splitAmount = Math.floor(pot.amount / payout.winnerIds.length);
      const remainder = pot.amount % payout.winnerIds.length;

      pot.winners = payout.winnerIds;
      pot.splitAmountPerWinner = splitAmount;

      payout.winnerIds.forEach((wId, idx) => {
        const winner = this.players.find(p => p.id === wId);
        if (winner) {
          const finalWin = splitAmount + (idx === 0 ? remainder : 0);
          winner.stack += finalWin;
          winner.wallet += finalWin;

          this.ledger.recordTransaction({
            roundNumber: this.roundNumber,
            playerId: winner.id,
            playerName: winner.name,
            type: 'WIN_POT',
            amount: finalWin,
            stackBefore: winner.stack - finalWin,
            stackAfter: winner.stack,
            reason: `Thắng ${pot.name}${payout.winnerIds.length > 1 ? ' (Chia hũ)' : ''}`,
          });
        }
      });
    }

    if (payouts[0]?.winnerIds?.length > 0) {
      this.lastHandWinnerId = payouts[0].winnerIds[0];
    }

    this.phase = 'FINISHED';
    this.lastActionSummary = 'Host đã xác nhận trao chip cho người thắng ván!';
  }

  // ----------------------------------------------------
  // PLAYER TOP-UP (NẠP THÊM CHIP) & REBUY
  // ----------------------------------------------------
  public playerTopUp(params: {
    playerId: string;
    amount: number;
    reason?: string;
  }): void {
    if (params.amount <= 0) throw new Error('Số chip nạp phải lớn hơn 0!');
    const player = this.players.find(p => p.id === params.playerId);
    if (!player) throw new Error('Không tìm thấy người chơi!');

    const before = player.stack;
    player.stack += params.amount;
    player.wallet += params.amount;

    this.ledger.recordTransaction({
      roundNumber: this.roundNumber,
      playerId: player.id,
      playerName: player.name,
      type: 'REBUY',
      amount: params.amount,
      stackBefore: before,
      stackAfter: player.stack,
      reason: params.reason || `Nạp thêm +${params.amount} chip`,
    });

    this.lastActionSummary = `${player.name} vừa nạp thêm +${params.amount} chip vào bàn.`;
  }

  // ----------------------------------------------------
  // HOST CONTROLS & REBUY
  // ----------------------------------------------------
  public adjustPlayerStack(params: {
    playerId: string;
    amountDelta: number;
    reason: string;
    adminId: string;
  }): void {
    const player = this.players.find(p => p.id === params.playerId);
    if (!player) throw new Error('Không tìm thấy người chơi!');

    const before = player.stack;
    player.stack = Math.max(0, player.stack + params.amountDelta);
    player.wallet = Math.max(0, player.wallet + params.amountDelta);

    this.ledger.recordTransaction({
      roundNumber: this.roundNumber,
      playerId: player.id,
      playerName: player.name,
      type: params.amountDelta > 0 ? 'REBUY' : 'ADMIN_ADJUST',
      amount: Math.abs(params.amountDelta),
      stackBefore: before,
      stackAfter: player.stack,
      reason: `Host điều chỉnh: ${params.reason}`,
    });

    this.lastActionSummary = `Host đã điều chỉnh stack của ${player.name} (${params.amountDelta >= 0 ? '+' : ''}${params.amountDelta} chip).`;
  }

  public updateSettings(newSettings: Partial<RoomSettings>): void {
    if (this.phase !== 'LOBBY' && this.phase !== 'FINISHED') {
      throw new Error('Chỉ có thể thay đổi cài đặt khi ván chơi chưa bắt đầu hoặc đã kết thúc!');
    }
    this.settings = { ...this.settings, ...newSettings };
  }

  // ----------------------------------------------------
  // HELPERS & TIMERS
  // ----------------------------------------------------
  public getActivePlayersInHand(): Player[] {
    return this.players.filter(p => !p.folded);
  }

  public getCurrentTurnPlayer(): Player | null {
    return this.players.find(p => p.id === this.currentTurnPlayerId) || null;
  }

  // ----------------------------------------------------
  // PUBLIC STATE SNAPSHOT
  // ----------------------------------------------------
  public getState(): GameState {
    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      roomName: this.roomName,
      hostId: this.hostId,
      pin: this.pin,
      settings: this.settings,
      players: this.players,
      phase: this.phase,
      roundNumber: this.roundNumber,
      dealerIndex: this.dealerIndex,
      currentTurnPlayerId: this.currentTurnPlayerId,
      currentHighBet: this.currentHighBet,
      minRaiseAmount: this.minRaiseAmount,
      totalPot: this.totalPot,
      pots: this.pots,
      turnTimeRemaining: this.turnTimeRemaining,
      history: this.ledger.getHistory(30),
      lastActionSummary: this.lastActionSummary,
    };
  }
}
