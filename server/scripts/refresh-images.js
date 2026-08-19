import { initStore, getStore } from '../src/db/index.js';
import { resolveImages, isUserProvided } from '../src/services/images.js';

function isDuplicateSlug(slug) {
  return /-\d+$/.test(slug || '');
}

async function main() {
  await initStore();
  const store = await getStore();
  const products = await store.collection('products').find({});

  const byName = new Map();
  for (const p of products) {
    const key = String(p.name || '').toLowerCase().trim();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(p);
  }

  let deleted = 0;
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const keep = group.find((p) => !isDuplicateSlug(p.slug)) ||
      group.slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];
    const dups = group.filter((p) => p._id !== keep._id);
    const keepImgs = (keep.images || []).filter(isUserProvided);
    for (const d of dups) {
      for (const u of d.images || []) {
        if (isUserProvided(u) && !keepImgs.includes(u)) keepImgs.push(u);
      }
    }
    if (keepImgs.length && !keepImgs.every((u) => (keep.images || []).includes(u))) {
      await store.collection('products').updateById(keep._id, { images: keepImgs });
    }
    for (const d of dups) {
      await store.collection('products').deleteById(d._id);
      deleted++;
      console.log(`  removed duplicate: ${d.slug}`);
    }
  }
  console.log(`Deleted ${deleted} duplicate products`);

  const remaining = await store.collection('products').find({});
  let changed = 0;
  for (const p of remaining) {
    const images = resolveImages(p, p.images || []);
    if (JSON.stringify(images) !== JSON.stringify(p.images || [])) {
      await store.collection('products').updateById(p._id, { images });
      changed++;
    }
    console.log(`  ${p.slug} -> ${images[0]}`);
  }
  console.log(`Refreshed images for ${changed} of ${remaining.length} products`);
  await store.flush();
  console.log('Database flushed');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
