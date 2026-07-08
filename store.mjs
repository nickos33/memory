import electron from 'electron';
const { app } = electron;
import fs from 'fs';
import path from 'path';

function getDataFile() {
  return path.join(app.getPath('userData'), 'memorials.json');
}

function read() {
  try {
    const file = getDataFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

function write(data) {
  fs.writeFileSync(getDataFile(), JSON.stringify(data, null, 2), 'utf-8');
}

export function getAll() {
  return read();
}

export function add(memorial) {
  const list = read();
  const newItem = {
    ...memorial,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(newItem);
  write(list);
  return newItem;
}

export function update(id, data) {
  const list = read();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('未找到该纪念日');
  list[index] = { ...list[index], ...data, updatedAt: new Date().toISOString() };
  write(list);
  return list[index];
}

export function remove(id) {
  const list = read();
  write(list.filter((m) => m.id !== id));
  return true;
}

export function togglePin(id) {
  const list = read();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('未找到该纪念日');
  list[index].pinned = !list[index].pinned;
  list[index].updatedAt = new Date().toISOString();
  write(list);
  return list[index];
}

export function reorder(ids) {
  const list = read();
  const reordered = ids.map((id, i) => {
    const item = list.find((m) => m.id === id);
    return { ...item, order: i, updatedAt: new Date().toISOString() };
  });
  write(reordered);
  return reordered;
}

export function exportData() {
  return JSON.stringify(read(), null, 2);
}

export function importData(jsonStr) {
  const incoming = JSON.parse(jsonStr);
  if (!Array.isArray(incoming)) return 0;
  const existing = read();
  const existingIds = new Set(existing.map((m) => m.id));
  const newItems = incoming.filter((m) => !existingIds.has(m.id));
  const merged = [...existing, ...newItems];
  merged.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  write(merged);
  return newItems.length;
}
