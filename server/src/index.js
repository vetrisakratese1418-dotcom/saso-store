import { createApp } from './app.js';
import { initStore, closeMongo } from './db/index.js';
import { env } from './config/env.js';
import { lowStockProducts } from './services/stock.js';
import { sendMail, orderHtml } from './services/email.js';

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

  const shutdown = async () => {
    clearInterval(timer);
    server.close(async () => {
      if (store.isMongo) await closeMongo();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
