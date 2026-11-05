import { DebtSettlement, Player } from './types';

export function calculateDebtSettlement(
  players: Player[],
  startingStack: number
): { settlements: DebtSettlement[]; netBalances: { playerId: string; playerName: string; net: number; currentStack: number }[] } {
  // Calculate net profit/loss for each player
  const netBalances = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    net: p.stack - startingStack,
    currentStack: p.stack,
  }));

  // Debtors (owe money / negative net) and Creditors (receive money / positive net)
  interface Person {
    id: string;
    name: string;
    amount: number;
  }

  const debtors: Person[] = [];
  const creditors: Person[] = [];

  for (const p of netBalances) {
    if (p.net < 0) {
      debtors.push({ id: p.playerId, name: p.playerName, amount: Math.abs(p.net) });
    } else if (p.net > 0) {
      creditors.push({ id: p.playerId, name: p.playerName, amount: p.net });
    }
  }

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: DebtSettlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0) {
      settlements.push({
        fromPlayerId: debtor.id,
        fromPlayerName: debtor.name,
        toPlayerId: creditor.id,
        toPlayerName: creditor.name,
        amount: settledAmount,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 0.001) dIdx++;
    if (creditor.amount <= 0.001) cIdx++;
  }

  return { settlements, netBalances };
}
