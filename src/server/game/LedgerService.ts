import { Transaction, TransactionType } from './types';
import { v4 as uuidv4 } from 'uuid';

export class LedgerService {
  private transactions: Transaction[] = [];
  private idempotencyKeys: Set<string> = new Set();

  public recordTransaction(params: {
    roundNumber: number;
    playerId: string;
    playerName: string;
    type: TransactionType;
    amount: number;
    stackBefore: number;
    stackAfter: number;
    reason?: string;
    idempotencyKey?: string;
  }): Transaction | null {
    if (params.idempotencyKey) {
      if (this.idempotencyKeys.has(params.idempotencyKey)) {
        console.warn(`[Ledger] Duplicate idempotencyKey ignored: ${params.idempotencyKey}`);
        return null;
      }
      this.idempotencyKeys.add(params.idempotencyKey);
    }

    const tx: Transaction = {
      id: uuidv4(),
      timestamp: Date.now(),
      roundNumber: params.roundNumber,
      playerId: params.playerId,
      playerName: params.playerName,
      type: params.type,
      amount: params.amount,
      stackBefore: params.stackBefore,
      stackAfter: params.stackAfter,
      reason: params.reason,
      idempotencyKey: params.idempotencyKey,
    };

    this.transactions.push(tx);
    return tx;
  }

  public getHistory(limit = 100): Transaction[] {
    return this.transactions.slice(-limit);
  }

  public getRoundTransactions(roundNumber: number): Transaction[] {
    return this.transactions.filter(t => t.roundNumber === roundNumber);
  }

  public getPlayerTransactions(playerId: string): Transaction[] {
    return this.transactions.filter(t => t.playerId === playerId);
  }
}
