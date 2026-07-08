const { app } = require('electron');
const fs = require('fs');
const path = require('path');

let Lunar;
try { Lunar = require('lunar-typescript').Lunar; } catch (_) {}

function getDataFile() {
  return path.join(app.getPath('userData'), 'memorials.json');
}

function read() {
  try {
    const file = getDataFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return data.map((m) => ({
        order: 0,
        isLunar: false,
        tags: [],
        ...m,
      }));
    }
  } catch (_) {}
  return [];
}

function write(data) {
  const clean = data.map(({ _lunarNextDate, ...rest }) => rest);
  fs.writeFileSync(getDataFile(), JSON.stringify(clean, null, 2), 'utf-8');
}

function computeLunarNextDate(dateStr) {
  if (!Lunar || !dateStr) return null;
  try {
    const d = new Date(dateStr);
    const lunar = Lunar.fromDate(d);
    const today = new Date();
    const thisYear = Lunar.fromDate(today).getYear();
    let next = Lunar.fromYmd(thisYear, lunar.getMonth(), lunar.getDay());
    let solar = next.getSolar();
    let nextDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
    if (nextDate < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) {
      const nextYear = Lunar.fromYmd(thisYear + 1, lunar.getMonth(), lunar.getDay());
      solar = nextYear.getSolar();
      nextDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
    }
    return nextDate.toISOString().slice(0, 10);
  } catch (_) {
    return null;
  }
}

function getAll() {
  const data = read();
  return data.map((m) => {
    if (m.isLunar) {
      m._lunarNextDate = computeLunarNextDate(m.date);
    }
    return m;
  });
}

function add(memorial) {
  const list = read();
  const maxOrder = list.reduce((max, m) => Math.max(max, m.order || 0), 0);
  const newItem = {
    ...memorial,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    pinned: false,
    order: maxOrder + 1,
    isLunar: memorial.isLunar || false,
    tags: memorial.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (newItem.isLunar) {
    newItem._lunarNextDate = computeLunarNextDate(newItem.date);
  }
  list.push(newItem);
  write(list);
  return newItem;
}

function update(id, data) {
  const list = read();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('未找到该纪念日');
  list[index] = { ...list[index], ...data, updatedAt: new Date().toISOString() };
  if (list[index].isLunar) {
    list[index]._lunarNextDate = computeLunarNextDate(list[index].date);
  }
  write(list);
  return list[index];
}

function remove(id) {
  const list = read();
  write(list.filter((m) => m.id !== id));
  return true;
}

function togglePin(id) {
  const list = read();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('未找到该纪念日');
  list[index].pinned = !list[index].pinned;
  list[index].updatedAt = new Date().toISOString();
  write(list);
  return list[index];
}

function reorder(orderedIds) {
  const list = read();
  const map = new Map(list.map((m) => [m.id, m]));
  orderedIds.forEach((id, index) => {
    if (map.has(id)) map.get(id).order = index;
  });
  write(list);
  return list;
}

function exportData() {
  return JSON.stringify(read(), null, 2);
}

function importData(jsonStr) {
  const incoming = JSON.parse(jsonStr);
  if (!Array.isArray(incoming)) throw new Error('无效的备份文件格式');
  const existing = read();
  const existingIds = new Set(existing.map((m) => m.id));
  const newItems = incoming.filter((m) => !existingIds.has(m.id));
  write([...existing, ...newItems]);
  return newItems.length;
}

module.exports = { getAll, add, update, remove, togglePin, reorder, exportData, importData };
