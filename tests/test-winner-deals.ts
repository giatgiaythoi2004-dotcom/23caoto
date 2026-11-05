import { io } from 'socket.io-client';

async function testWinnerDeals() {
  console.log('--- 🧪 TESTING CUSTOM RULE: WINNER DEALS & ACTS FIRST ---');

  const socketHost = io('http://localhost:3000');
  const socketP2 = io('http://localhost:3000');
  const socketP3 = io('http://localhost:3000');

  await Promise.all([
    new Promise(res => socketHost.on('connect', () => res(null))),
    new Promise(res => socketP2.on('connect', () => res(null))),
    new Promise(res => socketP3.on('connect', () => res(null))),
  ]);

  let roomCode = '';
  let hostId = '';
  let p2Id = '';
  let p3Id = '';

  // 1. Create Room with default dealerRule: WINNER_DEALS
  await new Promise<void>((resolve, reject) => {
    socketHost.emit(
      'room:create',
      {
        roomName: 'Bàn Luật Tự Do',
        hostName: 'Host Minh',
        settings: {
          startingStack: 10000,
          smallBlind: 100,
          bigBlind: 200,
          dealerRule: 'WINNER_DEALS',
        },
      },
      (res: any) => {
        if (!res.success) return reject(new Error(res.error));
        roomCode = res.roomCode;
        hostId = res.playerId;
        resolve();
      }
    );
  });

  // 2. Join P2 (Tuấn) & P3 (Hùng)
  await new Promise<void>(res => {
    socketP2.emit('room:join', { roomCode, playerName: 'Tuấn Poker' }, (r: any) => {
      p2Id = r.playerId;
      res();
    });
  });

  await new Promise<void>(res => {
    socketP3.emit('room:join', { roomCode, playerName: 'Hùng Liêng' }, (r: any) => {
      p3Id = r.playerId;
      res();
    });
  });

  let latestState: any = null;
  socketHost.on('game:state', (st) => {
    latestState = st;
  });

  // 3. Start Hand 1
  await new Promise<void>(res => {
    socketHost.emit('host:start_game', { roomCode, hostId }, res);
  });
  await new Promise(r => setTimeout(r, 200));

  console.log(`✓ Ván #1 bắt đầu: Dealer index: ${latestState.dealerIndex}, Lượt đầu: ${latestState.currentTurnPlayerId}`);

  // 4. In Hand 1, P3 and Host fold, making P2 (Tuấn) the winner!
  // Or Host and P3 fold:
  await new Promise<void>(res => {
    socketP2.emit('game:action', { roomId: roomCode, playerId: p2Id, action: 'CALL' }, res);
  });
  await new Promise(r => setTimeout(r, 100));

  // P3 folds
  await new Promise<void>(res => {
    socketP3.emit('game:action', { roomId: roomCode, playerId: p3Id, action: 'FOLD' }, res);
  });
  await new Promise(r => setTimeout(r, 100));

  // Host folds -> Tuấn automatically wins as last player standing!
  await new Promise<void>(res => {
    socketHost.emit('game:action', { roomId: roomCode, playerId: hostId, action: 'FOLD' }, res);
  });
  await new Promise(r => setTimeout(r, 200));

  console.log(`✓ Kết thúc ván #1: Phase = ${latestState.phase}, Tóm tắt: ${latestState.lastActionSummary}`);

  // 5. Host starts Hand 2
  await new Promise<void>(res => {
    socketHost.emit('host:start_game', { roomCode, hostId }, res);
  });
  await new Promise(r => setTimeout(r, 300));

  console.log(`✓ Ván #2 bắt đầu:`);
  const dealerPlayer = latestState.players[latestState.dealerIndex];
  const firstTurnPlayer = latestState.players.find((p: any) => p.id === latestState.currentTurnPlayerId);

  console.log(`  - Dealer (Người chia bài): ${dealerPlayer.name} (ID: ${dealerPlayer.id})`);
  console.log(`  - First Turn (Người tố đầu): ${firstTurnPlayer.name} (ID: ${firstTurnPlayer.id})`);

  // Verify: Tuấn Poker (p2Id) MUST be the dealer AND the first turn player!
  if (dealerPlayer.id === p2Id && firstTurnPlayer.id === p2Id) {
    console.log('✅ CHÍNH XÁC: Tuấn Poker (người thắng ván 1) ĐÃ LÀM NGƯỜI CHIA BÀI VÀ LÀ NGƯỜI TỐ ĐẦU TIÊN Ở VÁN 2!');
  } else {
    console.error('❌ Thất bại: Luật chưa đúng mong muốn!', { dealer: dealerPlayer.name, first: firstTurnPlayer.name });
    process.exit(1);
  }

  socketHost.disconnect();
  socketP2.disconnect();
  socketP3.disconnect();
  console.log('--- 🎉 KIỂM THỬ LUẬT TỐ ĐẦU HOÀN TOÀN THÀNH CÔNG! ---');
  process.exit(0);
}

testWinnerDeals().catch(err => {
  console.error(err);
  process.exit(1);
});
