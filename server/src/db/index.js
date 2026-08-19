import { env } from '../config/env.js';
import { LocalStore } from './localStore.js';
import { createMongoStore, closeMongo } from './mongoStore.js';

let storePromise = null;

export async function initStore() {
  if (storePromise) return storePromise;
  storePromise = (async () => {
    let store;
    let isMongo = false;
    if (env.mongoUri) {
      try {
        store = await createMongoStore(env.mongoUri);
        isMongo = true;
        console.log('[db] Connected to MongoDB');
      } catch (err) {
        console.warn(
          `[db] MongoDB connection failed (${err.message}). Falling back to the local JSON database.`,
        );
        store = new LocalStore();
      }
    } else {
      store = new LocalStore();
      console.log('[db] Using local JSON database (set MONGODB_URI to enable MongoDB)');
    }
    store.isMongo = isMongo;
    await store.seedSettings();
    return store;
  })();
  return storePromise;
}

export function getStore() {
  if (!storePromise) throw new Error('Store not initialized. Call initStore() first.');
  return storePromise;
}

export async function flushStore() {
  const store = await getStore();
  if (store.flush) await store.flush();
}

export { closeMongo };
