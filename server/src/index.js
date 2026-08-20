import { createApp } from './app.js';
import { initStore, closeMongo } from './db/index.js';
import { env } from './config/env.js';
import { lowStockProducts } from './services/stock.js';
import { sendMail, orderHtml } from './services/email.js';

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

async function main() {
  const store = await initStore();
  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`\n  ${env.storeName} API running at http://localhost:${env.port}`);
    console.log(`  Storage: ${store.isMongo ? 'MongoDB' : 'Local JSON database'}\n`);
  });

  const checkLowStock = async () => {
    const low = await lowStockProducts();
    if (low.length) {
      const adminEmails = env.adminEmail;
      await sendMail({
        to: adminEmails,
        subject: `Low stock alert: ${low.length} product(s) need attention`,
        html: orderHtml('lowStock', { products: low }),
      });
      console.log(`[alert] ${low.length} low-stock product(s)`);
    }
  };

  const timer = setInterval(checkLowStock, 6 * 60 * 60 * 1000);
  checkLowStock().catch((err) => console.error('[alert] Low stock check failed:', err.message));

  const shutdown = async (signal) => {
    console.log(`\n[shutdown] ${signal} received, shutting down...`);
    clearInterval(timer);
    const forceExit = setTimeout(() => {
      console.error('[shutdown] Forced exit after timeout');
      process.exit(1);
    }, 10000);
    forceExit.unref();
    server.close(async () => {
      if (store.isMongo) await closeMongo();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
