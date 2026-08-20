import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const sseClients = new Map();

router.get('/orders/:orderNumber/stream', requireAuth, wrap(async (req, res) => {
  const orderNumber = req.params.orderNumber;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':\n\n');

  const clientId = `${req.user._id}_${Date.now()}`;
  if (!sseClients.has(orderNumber)) sseClients.set(orderNumber, new Map());
  sseClients.get(orderNumber).set(clientId, res);

  req.on('close', () => {
    const clients = sseClients.get(orderNumber);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) sseClients.delete(orderNumber);
    }
  });

  const interval = setInterval(() => {
    try { res.write(':\n\n'); } catch { clearInterval(interval); }
  }, 30000);
  req.on('close', () => clearInterval(interval));
}));

export function broadcastOrderUpdate(orderNumber, data) {
  const clients = sseClients.get(orderNumber);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const [, res] of clients) {
    try { res.write(payload); } catch {}
  }
}

export default router;
