import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { uploadsDir } from './services/upload.js';
import {
  securityHeaders,
  corsOptions,
  limiter,
  authLimiter,
  mongoSanitize,
  sanitizeBody,
} from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import checkoutRoutes, { markPaidByOrderNumber } from './routes/checkout.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import sseRoutes from './routes/sse.js';
import { verifyCashfreeWebhook, verifyStripeWebhook, verifyUpiWebhook } from './services/payments.js';
import { getStore } from './db/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(cors(corsOptions));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

  app.post(
    '/api/payments/webhook/cashfree',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['x-webhook-signature'] || '';
      const timestamp = req.headers['x-webhook-timestamp'] || '';
      if (!verifyCashfreeWebhook(req.body.toString(), signature, timestamp)) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
      try {
        const event = JSON.parse(req.body.toString());
        const type = event.type || '';
        if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
          const order = event.data?.order || {};
          const payment = event.data?.payment || {};
          const cfOrderId = order.order_id || '';
          const orderNumber = cfOrderId.replace(/^cf_/, '');
          const txnId = payment.cf_payment_id || payment.payment_id || '';
          await markPaidByOrderNumber(orderNumber, 'cashfree', txnId);
        }
      } catch (err) {
        console.error('[webhook] cashfree error:', err.message);
      }
      res.status(200).send('OK');
    },
  );

  app.post(
    '/api/payments/webhook/stripe',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'] || '';
      const event = verifyStripeWebhook(req.body, signature);
      if (!event) return res.status(400).json({ error: 'Invalid signature' });
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;
        const orderNumber = pi.metadata?.orderNumber || '';
        await markPaidByOrderNumber(orderNumber, 'stripe', pi.id);
      }
      res.json({ received: true });
    },
  );

  app.post(
    '/api/payments/webhook/upi',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['x-upi-signature'] || '';
      if (!signature || !verifyUpiWebhook(req.body.toString(), signature)) {
        return res.status(400).json({ error: 'Invalid or missing signature' });
      }
      try {
        const body = JSON.parse(req.body.toString());
        const orderNumber = body.orderNumber || body.notes?.orderNumber || body.tr || '';
        const status = String(body.status || body.event || '').toLowerCase();
        const txnId = body.transactionId || body.txnId || body.reference_id || '';
        if (status === 'success' || status === 'paid' || status === 'captured' || body.paid) {
          await markPaidByOrderNumber(orderNumber, 'upi', txnId);
        }
      } catch (err) {
        console.error('[webhook] upi error:', err.message);
      }
      res.json({ received: true });
    },
  );

  app.use('/api', limiter);
  app.use('/api/auth', authLimiter);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(mongoSanitize());
  app.use(sanitizeBody);

  app.use('/api/auth', authRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api', checkoutRoutes);
  app.use('/api', userRoutes);
  app.use('/api', sseRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
