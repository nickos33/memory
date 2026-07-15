import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveLunarFields,
  formatDateOnly,
  getDaysUntil,
  getNextOccurrence,
  getOccurrenceText,
} from '../src/shared/memorial-date.mjs';

const localDate = (year, month, day) => new Date(year, month - 1, day, 12);

test('公历周年在当年日期过去后滚动到下一年', () => {
  const memorial = { date: '2020-05-20', recurrence: 'yearly', isLunar: false };
  assert.equal(formatDateOnly(getNextOccurrence(memorial, localDate(2026, 5, 19))), '2026-05-20');
  assert.equal(formatDateOnly(getNextOccurrence(memorial, localDate(2026, 5, 21))), '2027-05-20');
});

test('2 月 29 日在非闰年按 2 月 28 日提醒', () => {
  const memorial = { date: '2020-02-29', recurrence: 'yearly', isLunar: false };
  assert.equal(formatDateOnly(getNextOccurrence(memorial, localDate(2026, 2, 1))), '2026-02-28');
});

test('仅一次记录保留原始日期', () => {
  const memorial = { date: '2025-12-01', recurrence: 'once', isLunar: false };
  assert.equal(formatDateOnly(getNextOccurrence(memorial, localDate(2026, 1, 1))), '2025-12-01');
  assert.equal(getOccurrenceText(memorial, localDate(2026, 1, 1)).text, '已过31天');
});

test('农历正月初一按当前农历年换算下一次公历日期', () => {
  const memorial = {
    date: '2020-01-25',
    recurrence: 'yearly',
    isLunar: true,
    lunarMonth: 1,
    lunarDay: 1,
    lunarLeap: false,
  };
  assert.equal(formatDateOnly(getNextOccurrence(memorial, localDate(2026, 1, 1))), '2026-02-17');
  assert.equal(formatDateOnly(getNextOccurrence(memorial, localDate(2026, 2, 18))), '2027-02-06');
});

test('旧农历记录可以从原公历日期推导农历月日', () => {
  assert.deepEqual(deriveLunarFields('2020-01-25'), {
    lunarYear: 2020,
    lunarMonth: 1,
    lunarDay: 1,
    lunarLeap: false,
  });
});

test('天数计算不受一天长度和夏令时影响', () => {
  assert.equal(getDaysUntil(localDate(2026, 3, 8), localDate(2026, 3, 7)), 1);
});
