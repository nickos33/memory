import electron from 'electron/main';
import fs from 'fs';
import path from 'path';

const { app } = electron;

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
