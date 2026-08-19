import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const COLLECTIONS = [
  'users',
  'products',
  'categories',
  'reviews',
  'orders',
  'coupons',
  'inventoryLogs',
  'newsletterSubscribers',
  'settings',
  'paymentSessions',
  'paymentComplaints',
];

const DEFAULT_SYSTEM_SETTINGS = [
  { key: 'storeName', value: 'saso' },
  { key: 'announcement', value: 'Free shipping on orders above ₹499' },
  { key: 'currency', value: 'INR' },
  { key: 'currencySymbol', value: '₹' },
  { key: 'heroTitle', value: 'Shop the New. Love the Everyday.' },
  { key: 'heroSubtitle', value: 'Premium products, curated for you.' },
  { key: 'featuredBannerTitle', value: '' },
  { key: 'featuredBannerSubtitle', value: '' },
  { key: 'featuredBannerLink', value: '/shop' },
  { key: 'newsletterEnabled', value: 'true' },
];

class LocalCollection {
  constructor(name, db) {
    this.name = name;
    this.db = db;
  }

  _findAll() {
    const rows = this.db.data[this.name] || [];
    return rows;
  }

  _save() {
    this.db._persist();
  }

  async find(query = {}, options = {}) {
    const { sort = {}, skip = 0, limit = 0 } = options;
    let rows = this._findAll().filter((d) => matches(d, query));
    rows = applySort(rows, sort);
    if (skip) rows = rows.slice(skip);
    if (limit) rows = rows.slice(0, limit);
    return rows.map((d) => ({ ...d }));
  }

  async findOne(query = {}) {
    const rows = this._findAll().filter((d) => matches(d, query));
    return rows[0] ? { ...rows[0] } : null;
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async insert(doc) {
    const now = new Date().toISOString();
    const record = { _id: randomUUID(), createdAt: now, updatedAt: now, ...doc };
    this.db.data[this.name] = this.db.data[this.name] || [];
    this.db.data[this.name].push(record);
    this._save();
    return { ...record };
  }

  async insertMany(docs) {
    const inserted = [];
    for (const d of docs) inserted.push(await this.insert(d));
    return inserted;
  }

  async updateById(id, patch) {
    const row = this.db.data[this.name]?.find((d) => d._id === id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    this._save();
    return { ...row };
  }

  async update(query, patch) {
    const row = this.db.data[this.name]?.find((d) => matches(d, query));
    if (!row) return { matched: 0, modified: 0, doc: null };
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    this._save();
    return { matched: 1, modified: 1, doc: { ...row } };
  }

  async deleteById(id) {
    const arr = this.db.data[this.name] || [];
    const idx = arr.findIndex((d) => d._id === id);
    if (idx === -1) return false;
    arr.splice(idx, 1);
    this._save();
    return true;
  }

  async delete(query) {
    const arr = this.db.data[this.name] || [];
    const before = arr.length;
    this.db.data[this.name] = arr.filter((d) => !matches(d, query));
    const deleted = before - this.db.data[this.name].length;
    if (deleted) this._save();
    return { deleted };
  }

  async count(query = {}) {
    return this._findAll().filter((d) => matches(d, query)).length;
  }

  async distinct(field, query = {}) {
    const seen = new Set();
    for (const d of this._findAll()) {
      if (matches(d, query)) {
        const v = getPath(d, field);
        if (Array.isArray(v)) v.forEach((x) => seen.add(x));
        else seen.add(v);
      }
    }
    return [...seen];
  }

  async exists(query = {}) {
    return (await this.count(query)) > 0;
  }
}

function getPath(obj, path) {
  const keys = String(path).split('.');
  let v = obj;
  for (const k of keys) {
    if (v == null) return undefined;
    v = v[k];
  }
  return v;
}

function matches(doc, query = {}) {
  for (const [key, cond] of Object.entries(query)) {
    if (key === '$or') {
      if (!cond.some((q) => matches(doc, q))) return false;
      continue;
    }
    if (key === '$and') {
      if (!cond.every((q) => matches(doc, q))) return false;
      continue;
    }
    if (key === '$nor') {
      if (cond.some((q) => matches(doc, q))) return false;
      continue;
    }
    const val = getPath(doc, key);
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      const hasOp = Object.keys(cond).some((k) => k.startsWith('$'));
      if (!hasOp) {
        if (!shallowEqual(val, cond)) return false;
        continue;
      }
      for (const [op, expected] of Object.entries(cond)) {
        if (!opMatch(op, val, expected)) return false;
      }
      continue;
    }
    if (!shallowEqual(val, cond)) return false;
  }
  return true;
}

function opMatch(op, val, expected) {
  switch (op) {
    case '$eq':
      return shallowEqual(val, expected);
    case '$ne':
      return !shallowEqual(val, expected);
    case '$in':
      return Array.isArray(expected) && expected.some((e) => shallowEqual(val, e));
    case '$nin':
      return !(Array.isArray(expected) && expected.some((e) => shallowEqual(val, e)));
    case '$gt':
      return val != null && val > expected;
    case '$gte':
      return val != null && val >= expected;
    case '$lt':
      return val != null && val < expected;
    case '$lte':
      return val != null && val <= expected;
    case '$regex': {
      if (val == null) return false;
      const re = typeof expected === 'string' ? new RegExp(expected, 'i') : expected;
      return re.test(String(val));
    }
    case '$exists':
      return expected ? val !== undefined && val !== null : val === undefined || val === null;
    case '$size':
      return Array.isArray(val) && val.length === expected;
    case '$all':
      return Array.isArray(val) && expected.every((e) => val.includes(e));
    default:
      return true;
  }
}

function shallowEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((x, i) => shallowEqual(x, b[i]));
  }
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function applySort(rows, sort) {
  if (!sort || Object.keys(sort).length === 0) return rows;
  const entries = Object.entries(sort);
  return [...rows].sort((a, b) => {
    for (const [field, dir] of entries) {
      const va = getPath(a, field);
      const vb = getPath(b, field);
      let cmp = 0;
      if (va == null && vb == null) cmp = 0;
      else if (va == null) cmp = -1;
      else if (vb == null) cmp = 1;
      else if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      if (cmp !== 0) return (dir || 1) < 0 ? -cmp : cmp;
    }
    return 0;
  });
}

class LocalStore {
  constructor() {
    this.data = {};
    this._timer = null;
    this._ensureFile();
    this.collections = Object.fromEntries(
      COLLECTIONS.map((c) => [c, new LocalCollection(c, this)]),
    );
  }

  _ensureFile() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      this.data = {};
      this._persistSync();
      return;
    }
    try {
      this.data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
      this.data = {};
      this._persistSync();
    }
  }

  _persistSync() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
  }

  _persist() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._persistSync(), 50);
  }

  async flush() {
    clearTimeout(this._timer);
    this._timer = null;
    this._persistSync();
  }

  async seedSettings() {
    for (const s of DEFAULT_SYSTEM_SETTINGS) {
      const existing = await this.collections.settings.findOne({ key: s.key });
      if (!existing) {
        await this.collections.settings.insert({ ...s });
      }
    }
  }

  collection(name) {
    if (!this.collections[name]) throw new Error(`Unknown collection: ${name}`);
    return this.collections[name];
  }

  async getSetting(key, fallback = '') {
    const s = await this.collections.settings.findOne({ key });
    return s ? s.value : fallback;
  }

  async setSetting(key, value) {
    const existing = await this.collections.settings.findOne({ key });
    if (existing) return this.collections.settings.updateById(existing._id, { value });
    return this.collections.settings.insert({ key, value });
  }

  async reset(seedData = null) {
    clearTimeout(this._timer);
    this.data = seedData || {};
    this._persistSync();
  }
}

export { LocalStore, COLLECTIONS };
