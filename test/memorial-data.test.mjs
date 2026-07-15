import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeImportedMemorials,
  normalizeMemorial,
  reorderMemorials,
} from '../src/shared/memorial-data.mjs';

const item = (id, order, pinned = false) => ({
  id,
  name: `纪念日 ${id}`,
  date: '2020-05-20',
  reason: '纪念',
  notes: '',
  tags: [],
  isLunar: false,
  recurrence: 'yearly',
  pinned,
  order,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

test('筛选后的局部重排不会删除未显示记录', () => {
  const result = reorderMemorials(
    [item('a', 0), item('b', 1), item('c', 2), item('d', 3)],
    ['d', 'b'],
    '2026-07-14T00:00:00.000Z'
  );

  assert.equal(result.length, 4);
  assert.deepEqual(
    [...result].sort((a, b) => a.order - b.order).map((entry) => entry.id),
    ['a', 'd', 'c', 'b']
  );
});

test('重排拒绝重复或不存在的 ID', () => {
  const list = [item('a', 0), item('b', 1)];
  assert.throws(() => reorderMemorials(list, ['a', 'a']), /重复/);
  assert.throws(() => reorderMemorials(list, ['missing']), /不存在/);
});

test('旧记录默认按每年重复并补齐安全默认值', () => {
  const result = normalizeMemorial({
    id: 'legacy',
    name: '  妈妈  ',
    date: '1990-03-08',
    reason: '生日',
  });

  assert.equal(result.name, '妈妈');
  assert.equal(result.recurrence, 'yearly');
  assert.deepEqual(result.tags, []);
  assert.equal(result.order, 0);
});

test('导入会拒绝无效记录和导入文件内的重复 ID', () => {
  assert.throws(
    () => mergeImportedMemorials([], [null]),
    /第 1 条记录/
  );
  assert.throws(
    () => mergeImportedMemorials([], [item('a', 0), item('a', 1)]),
    /重复 ID/
  );
});

test('导入过滤已有 ID 并保留完整现有数据', () => {
  const existing = [item('a', 0)];
  const { merged, importedCount } = mergeImportedMemorials(existing, [item('a', 4), item('b', 5)]);
  assert.equal(importedCount, 1);
  assert.deepEqual(merged.map((entry) => entry.id), ['a', 'b']);
});
