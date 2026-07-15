import { deriveLunarFields, parseDateOnly } from './memorial-date.mjs';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}不能为空`);
  return value.trim();
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) {
    throw new Error('标签必须是字符串数组');
  }
  return [...new Set(value.map((tag) => tag.trim()).filter(Boolean))];
}

export function normalizeMemorial(input, options = {}) {
  const { requireId = true, now = new Date().toISOString() } = options;
  if (!isPlainObject(input)) throw new Error('记录必须是对象');

  const id = input.id === undefined ? '' : requiredText(input.id, 'ID');
  if (requireId && !id) throw new Error('ID不能为空');
  const name = requiredText(input.name, '人名');
  const reason = requiredText(input.reason, '事由');
  const date = requiredText(input.date, '日期');
  parseDateOnly(date);

  const recurrence = input.recurrence || 'yearly';
  if (!['yearly', 'once'].includes(recurrence)) throw new Error('重复规则只能是 yearly 或 once');

  const isLunar = Boolean(input.isLunar);
  let lunar = {};
  if (isLunar) {
    const derived = Number.isInteger(input.lunarMonth) && Number.isInteger(input.lunarDay)
      ? {
          lunarYear: Number.isInteger(input.lunarYear) ? input.lunarYear : deriveLunarFields(date).lunarYear,
          lunarMonth: input.lunarMonth,
          lunarDay: input.lunarDay,
          lunarLeap: Boolean(input.lunarLeap),
        }
      : deriveLunarFields(date);
    if (derived.lunarMonth < 1 || derived.lunarMonth > 12) throw new Error('农历月份必须在 1 到 12 之间');
    if (derived.lunarDay < 1 || derived.lunarDay > 30) throw new Error('农历日期必须在 1 到 30 之间');
    if (derived.lunarYear < 1900 || derived.lunarYear > 2100) throw new Error('农历年份必须在 1900 到 2100 之间');
    lunar = derived;
  }

  const order = Number.isFinite(input.order) ? Number(input.order) : 0;
  return {
    ...(id ? { id } : {}),
    name,
    date,
    reason,
    notes: optionalText(input.notes),
    tags: normalizedTags(input.tags),
    isLunar,
    ...lunar,
    recurrence,
    pinned: Boolean(input.pinned),
    order,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : now,
  };
}

export function reorderMemorials(list, orderedIds, now = new Date().toISOString()) {
  if (!Array.isArray(orderedIds)) throw new Error('排序数据必须是 ID 数组');
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length) throw new Error('排序数据包含重复 ID');
  const byId = new Map(list.map((entry) => [entry.id, entry]));
  for (const id of orderedIds) {
    if (!byId.has(id)) throw new Error(`排序记录不存在：${id}`);
  }

  const orderById = new Map();
  for (const pinned of [true, false]) {
    const group = list
      .filter((entry) => Boolean(entry.pinned) === pinned)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const requested = orderedIds.filter((id) => Boolean(byId.get(id).pinned) === pinned);
    let cursor = 0;
    const arranged = group.map((entry) => (unique.has(entry.id) ? byId.get(requested[cursor++]) : entry));
    arranged.forEach((entry, index) => orderById.set(entry.id, index));
  }

  return list.map((entry) => {
    const order = orderById.get(entry.id);
    return order === entry.order ? entry : { ...entry, order, updatedAt: now };
  });
}

export function mergeImportedMemorials(existing, incoming) {
  if (!Array.isArray(incoming)) throw new Error('备份文件最外层必须是数组');
  const normalized = incoming.map((entry, index) => {
    try {
      return normalizeMemorial(entry);
    } catch (error) {
      throw new Error(`第 ${index + 1} 条记录无效：${error.message}`);
    }
  });
  const incomingIds = new Set();
  for (const entry of normalized) {
    if (incomingIds.has(entry.id)) throw new Error(`备份文件包含重复 ID：${entry.id}`);
    incomingIds.add(entry.id);
  }

  const existingIds = new Set(existing.map((entry) => entry.id));
  const newItems = normalized.filter((entry) => !existingIds.has(entry.id));
  return { merged: [...existing, ...newItems], importedCount: newItems.length };
}
