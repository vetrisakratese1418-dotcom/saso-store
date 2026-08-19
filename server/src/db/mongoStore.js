import mongoose from 'mongoose';
import { Models } from './schemas.js';

function toObject(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o._id = String(o._id);
  return o;
}

function buildQuery(query) {
  const q = {};
  for (const [key, cond] of Object.entries(query || {})) {
    q[key] = cond;
  }
  return q;
}

class MongoCollection {
  constructor(model) {
    this.model = model;
  }

  _idFrom(id) {
    if (mongoose.isValidObjectId(id)) return new mongoose.Types.ObjectId(id);
    return id;
  }

  async find(query = {}, options = {}) {
    let q = this.model.find(buildQuery(query));
    const sort = options.sort || {};
    if (Object.keys(sort).length) q = q.sort(sort);
    if (options.skip) q = q.skip(options.skip);
    if (options.limit) q = q.limit(options.limit);
    if (options.select) q = q.select(options.select);
    const docs = await q.exec();
    return docs.map(toObject);
  }

  async findOne(query = {}) {
    return toObject(await this.model.findOne(buildQuery(query)).exec());
  }

  async findById(id) {
    return toObject(await this.model.findById(this._idFrom(id)).exec());
  }

  async insert(doc) {
    const created = await this.model.create(doc);
    return toObject(created);
  }

  async insertMany(docs) {
    const created = await this.model.insertMany(docs);
    return created.map(toObject);
  }

  async updateById(id, patch) {
    const doc = await this.model
      .findByIdAndUpdate(this._idFrom(id), { $set: patch }, { new: true })
      .exec();
    return toObject(doc);
  }

  async update(query, patch) {
    const doc = await this.model
      .findOneAndUpdate(buildQuery(query), { $set: patch }, { new: true })
      .exec();
    return { matched: doc ? 1 : 0, modified: doc ? 1 : 0, doc: toObject(doc) };
  }

  async deleteById(id) {
    const res = await this.model.findByIdAndDelete(this._idFrom(id)).exec();
    return !!res;
  }

  async delete(query) {
    const res = await this.model.deleteMany(buildQuery(query)).exec();
    return { deleted: res.deletedCount || 0 };
  }

  async count(query = {}) {
    return this.model.countDocuments(buildQuery(query)).exec();
  }

  async distinct(field, query = {}) {
    return this.model.distinct(field, buildQuery(query)).exec();
  }

  async exists(query = {}) {
    return (await this.count(query)) > 0;
  }
}

class MongoStore {
  constructor(uri) {
    this.uri = uri;
    this.collections = Object.fromEntries(
      Object.entries(Models).map(([name, model]) => [name, new MongoCollection(model)]),
    );
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

  async seedSettings() {
    const defaults = {
      storeName: 'saso',
      announcement: 'Free shipping on orders above ₹499',
      currency: 'INR',
      currencySymbol: '₹',
      heroTitle: 'Shop the New. Love the Everyday.',
      heroSubtitle: 'Premium products, curated for you.',
      featuredBannerTitle: '',
      featuredBannerSubtitle: '',
      featuredBannerLink: '/shop',
      newsletterEnabled: 'true',
    };
    for (const [key, value] of Object.entries(defaults)) {
      const existing = await this.collections.settings.findOne({ key });
      if (!existing) await this.collections.settings.insert({ key, value });
    }
  }
}

export async function createMongoStore(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return new MongoStore(uri);
}

export function closeMongo() {
  return mongoose.disconnect();
}
