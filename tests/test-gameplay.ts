import { io } from 'socket.io-client';

async function runTest() {
  console.log('--- 🧪 STARTING PRIVATE CASINO TABLE INTEGRATION TEST ---');

  const socketHost = io('http://localhost:3000');
  const socketP2 = io('http://localhost:3000');
  const socketP3 = io('http://localhost:3000');

  // Wait for sockets to connect
  await Promise.all([
    new Promise(res => socketHost.on('connect', () => res(null))),
    new Promise(res => socketP2.on('connect', () => res(null))),
    new Promise(res => socketP3.on('connect', () => res(null))),
  ]);
  console.log('✓ All 3 sockets connected successfully.');

  let roomCode = '';
  let hostId = '';
  let p2Id = '';
  let p3Id = '';

  // 1. Host creates room
  await new Promise<void>((resolve, reject) => {
    socketHost.emit(
      'room:create',
      {
        roomName: 'Bàn Poker Test #1',
        hostName: 'Host Minh',
        settings: { startingStack: 10000, smallBlind: 100, bigBlind: 200 },
      },
      (res: any) => {
        if (!res.success) return reject(new Error(res.error));
        roomCode = res.roomCode;
        hostId = res.playerId;
        console.log(`✓ Room created with Code: ${roomCode}, HostId: ${hostId}`);
        resolve();
      }
    );
  });

  // 2. Player 2 joins
  await new Promise<void>((resolve, reject) => {
    socketP2.emit(
      'room:join',
      { roomCode, playerName: 'Tuấn Poker' },
      (res: any) => {
        if (!res.success) return reject(new Error(res.error));
        p2Id = res.playerId;
        console.log(`✓ Player 2 joined (Tuấn, ID: ${p2Id})`);
        resolve();
      }
    );
  });

  // 3. Player 3 joins
  await new Promise<void>((resolve, reject) => {
    socketP3.emit(
      'room:join',
      { roomCode, playerName: 'Hùng Liêng' },
      (res: any) => {
        if (!res.success) return reject(new Error(res.error));
        p3Id = res.playerId;
        console.log(`✓ Player 3 joined (Hùng, ID: ${p3Id})`);
        resolve();
      }
    );
  });

  // 4. Host starts hand
  let currentGameState: any = null;
  socketHost.on('game:state', (st) => {
    currentGameState = st;
  });

  await new Promise<void>((resolve, reject) => {
    socketHost.emit('host:start_game', { roomCode, hostId }, (res: any) => {
      if (!res.success) return reject(new Error(res.error));
      console.log('✓ Hand started!');
      resolve();
    });
  });

  // Allow game state to settle
  await new Promise(r => setTimeout(r, 200));

  console.log(`✓ Ván #${currentGameState.roundNumber} Phase: ${currentGameState.phase}, Total Pot: ${currentGameState.totalPot}`);
  console.log(`✓ Current Turn Player: ${currentGameState.players.find((p: any) => p.id === currentGameState.currentTurnPlayerId)?.name}`);

  // 5. Test Debt Settlement calculation
  await new Promise<void>((resolve, reject) => {
    socketHost.emit('room:get_settlement', { roomCode }, (res: any) => {
      if (!res.success) return reject(new Error(res.error));
      console.log('✓ Settlement calculated successfully:', res.settlement);
      resolve();
    });
  });

  socketHost.disconnect();
  socketP2.disconnect();
  socketP3.disconnect();
  console.log('--- 🎉 ALL INTEGRATION TESTS PASSED PERFECTLY! ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
