import electron from 'electron';
const { app } = electron;
import fs from 'fs';
import path from 'path';
import {
  mergeImportedMemorials,
  normalizeMemorial,
  reorderMemorials,
} from './src/shared/memorial-data.mjs';

export class DataStoreError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'DataStoreError';
  }
}

function getDataFile() {
  return path.join(app.getPath('userData'), 'memorials.json');
}

function read() {
  const file = getDataFile();
  if (!fs.existsSync(file)) return [];

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    throw new DataStoreError(`纪念日数据文件损坏，原文件已保留：${file}`, error);
  }
  if (!Array.isArray(parsed)) {
    throw new DataStoreError(`纪念日数据格式错误，原文件已保留：${file}`);
  }
  try {
    return parsed.map((entry, index) => {
      try {
        return normalizeMemorial(entry);
      } catch (error) {
        throw new Error(`第 ${index + 1} 条记录：${error.message}`);
      }
    });
  } catch (error) {
    throw new DataStoreError(`纪念日数据无法读取，原文件已保留：${error.message}`, error);
  }
}

function write(data) {
  const file = getDataFile();
  const tempFile = `${file}.tmp-${process.pid}`;
  const backupFile = `${file}.bak`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    if (fs.existsSync(file)) fs.copyFileSync(file, backupFile);
    fs.renameSync(tempFile, file);
  } catch (error) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (_) {}
    throw new DataStoreError(`保存纪念日数据失败：${error.message}`, error);
  }
}

export function getAll() {
  return read();
}

export function add(memorial) {
  const list = read();
  const now = new Date().toISOString();
  const maxOrder = list.reduce((max, entry) => Math.max(max, entry.order ?? 0), -1);
  const newItem = normalizeMemorial(
    {
      ...memorial,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
      pinned: false,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    },
    { now }
  );
  list.push(newItem);
  write(list);
  return newItem;
}

export function update(id, data) {
  const list = read();
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error('未找到该纪念日');
  const current = list[index];
  list[index] = normalizeMemorial({
    ...current,
    ...data,
    id: current.id,
    pinned: current.pinned,
    order: current.order,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
  write(list);
  return list[index];
}

export function remove(id) {
  const list = read();
  const next = list.filter((entry) => entry.id !== id);
  if (next.length === list.length) return false;
  write(next);
  return true;
}

export function togglePin(id) {
  const list = read();
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error('未找到该纪念日');
  list[index] = {
    ...list[index],
    pinned: !list[index].pinned,
    updatedAt: new Date().toISOString(),
  };
  write(list);
  return list[index];
}

export function reorder(ids) {
  const reordered = reorderMemorials(read(), ids);
  write(reordered);
  return reordered;
}

export function exportData() {
  return JSON.stringify(read(), null, 2);
}

export function importData(jsonStr) {
  let incoming;
  try {
    incoming = JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`备份文件不是有效的 JSON：${error.message}`);
  }
  const { merged, importedCount } = mergeImportedMemorials(read(), incoming);
  if (importedCount > 0) write(merged);
  return importedCount;
}
