import http from 'http';
import express, { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { setupSocketHandlers } from './socket/socketHandler';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  setupSocketHandlers(io);

  server.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Next.js fallback
  server.use((req: Request, res: Response) => {
    return handle(req, res);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> 🎰 Private Casino Table running at http://${hostname}:${port}`);
    console.log(`> 📱 Local access: http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
