import { Router } from 'express';
import { getStore } from '../db/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { adjustStock } from '../services/stock.js';

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

router.get('/admin/returns', requireAdmin, wrap(async (req, res) => {
  const store = await getStore();
  const requests = await store.collection('returnRequests').find({}, { sort: { createdAt: -1 } });
  res.json(requests);
}));

router.patch('/admin/returns/:id', requireAdmin, wrap(async (req, res) => {
  const store = await getStore();
  const { status, adminNote } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected', 'refunded', 'completed'];
  if (!validStatuses.includes(status)) throw new AppError('Invalid status');

  const returnReq = await store.collection('returnRequests').findById(req.params.id);
  if (!returnReq) throw new AppError('Return request not found', 404);

  const patch = { status, adminNote: adminNote || returnReq.adminNote };

  if (status === 'refunded' || status === 'completed') {
    for (const item of returnReq.items) {
      await adjustStock({
        productId: item.productId,
        change: item.qty,
        reason: 'return',
        reference: `return-${returnReq.orderNumber}`,
        by: req.user.email || 'admin',
      });
    }
  }

  await store.collection('returnRequests').updateById(returnReq._id, patch);

  const order = await store.collection('orders').findOne({ orderNumber: returnReq.orderNumber });
  if (order) {
    await store.collection('orders').updateById(order._id, { returnRequest: patch });
  }

  broadcastOrderUpdate(returnReq.orderNumber, { type: 'return', status, orderNumber: returnReq.orderNumber });

  res.json({ ok: true, returnRequest: { ...returnReq, ...patch } });
}));

export default router;
