import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { getModel } from '../models/index.js';

const memory = new Map();
const idOf = (value) => String(value?._id ?? value?.id ?? '');
const matches = (row, filter = {}) => Object.entries(filter).every(([key, val]) => {
  if (val && typeof val === 'object' && '$in' in val) return val.$in.map(String).includes(String(row[key]));
  return String(row[key] ?? '') === String(val ?? '');
});
const rows = (collection) => { if (!memory.has(collection)) memory.set(collection, []); return memory.get(collection); };

export const repository = {
  get mode() { return mongoose.connection.readyState === 1 ? 'mongo' : 'memory'; },
  async getAll(collection, filter = {}, sort = {}) {
    if (this.mode === 'mongo') return getModel(collection).find(filter).sort(sort).lean();
    let result = rows(collection).filter((row) => matches(row, filter));
    const [key, direction] = Object.entries(sort)[0] || [];
    if (key) result = [...result].sort((a, b) => (a[key] > b[key] ? 1 : -1) * (direction < 0 ? -1 : 1));
    return structuredClone(result);
  },
  async getById(collection, id) {
    if (this.mode === 'mongo') return getModel(collection).findById(id).lean();
    return structuredClone(rows(collection).find((row) => idOf(row) === String(id)) || null);
  },
  async getOne(collection, filter = {}) {
    if (this.mode === 'mongo') return getModel(collection).findOne(filter).lean();
    return structuredClone(rows(collection).find((row) => matches(row, filter)) || null);
  },
  async create(collection, data) {
    if (this.mode === 'mongo') return (await getModel(collection).create(data)).toObject();
    const item = { ...structuredClone(data), _id: data._id || randomUUID(), createdAt: data.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    rows(collection).push(item);
    return structuredClone(item);
  },
  async updateById(collection, id, updates) {
    if (this.mode === 'mongo') return getModel(collection).findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
    const row = rows(collection).find((item) => idOf(item) === String(id));
    if (!row) return null;
    Object.assign(row, structuredClone(updates), { updatedAt: new Date().toISOString() });
    return structuredClone(row);
  },
  async upsert(collection, filter, createData, updateData) {
    if (this.mode === 'mongo') return getModel(collection).findOneAndUpdate(filter, { $setOnInsert: createData, $set: updateData }, { upsert: true, new: true }).lean();
    const found = await this.getOne(collection, filter);
    return found ? this.updateById(collection, idOf(found), updateData) : this.create(collection, { ...filter, ...createData, ...updateData });
  },
  async deleteById(collection, id) {
    if (this.mode === 'mongo') return getModel(collection).findByIdAndDelete(id).lean();
    const items = rows(collection); const index = items.findIndex((row) => idOf(row) === String(id));
    return index < 0 ? null : structuredClone(items.splice(index, 1)[0]);
  },
  async deleteWhere(collection, filter = {}) {
    if (this.mode === 'mongo') return (await getModel(collection).deleteMany(filter)).deletedCount;
    const items = rows(collection); const kept = items.filter((row) => !matches(row, filter));
    const deleted = items.length - kept.length; memory.set(collection, kept); return deleted;
  },
  async count(collection, filter = {}) {
    if (this.mode === 'mongo') return getModel(collection).countDocuments(filter);
    return rows(collection).filter((row) => matches(row, filter)).length;
  }
};
