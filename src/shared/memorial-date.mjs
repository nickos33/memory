import { Lunar, Solar } from 'lunar-typescript';

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

export function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('日期必须使用 YYYY-MM-DD 格式');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`无效日期：${value}`);
  }
  return date;
}

export function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function solarOccurrence(year, month, day) {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return new Date(year, 1, 28);
  }
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('纪念日包含无效的月日');
  }
  return date;
}

export function deriveLunarFields(dateValue) {
  const date = parseDateOnly(dateValue);
  const lunar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar();
  const signedMonth = lunar.getMonth();
  return {
    lunarYear: lunar.getYear(),
    lunarMonth: Math.abs(signedMonth),
    lunarDay: lunar.getDay(),
    lunarLeap: signedMonth < 0,
  };
}

export function lunarDateToSolar(lunarYear, lunarMonth, lunarDay, lunarLeap = false) {
  if (!Number.isInteger(lunarYear) || lunarYear < 1900 || lunarYear > 2100) {
    throw new Error('农历年份必须在 1900 到 2100 之间');
  }
  const signedMonth = lunarLeap ? -lunarMonth : lunarMonth;
  try {
    const solar = Lunar.fromYmd(lunarYear, signedMonth, lunarDay).getSolar();
    return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
  } catch (_) {
    throw new Error('所选农历日期无效，或该年份没有这个闰月');
  }
}

function lunarFields(memorial) {
  const hasFields = Number.isInteger(memorial.lunarMonth) && Number.isInteger(memorial.lunarDay);
  return hasFields
      ? {
        lunarYear: memorial.lunarYear,
        lunarMonth: memorial.lunarMonth,
        lunarDay: memorial.lunarDay,
        lunarLeap: Boolean(memorial.lunarLeap),
      }
    : deriveLunarFields(memorial.date);
}

export function getNextOccurrence(memorial, from = new Date()) {
  const today = startOfDay(from);
  const recurrence = memorial.recurrence || 'yearly';
  if (recurrence === 'once') return parseDateOnly(memorial.date);

  if (memorial.isLunar) {
    const { lunarMonth, lunarDay, lunarLeap } = lunarFields(memorial);
    const signedMonth = lunarLeap ? -lunarMonth : lunarMonth;
    const candidates = [];
    for (let lunarYear = today.getFullYear() - 1; lunarYear <= today.getFullYear() + 2; lunarYear += 1) {
      try {
        const candidate = lunarDateToSolar(lunarYear, Math.abs(signedMonth), lunarDay, signedMonth < 0);
        if (candidate >= today) candidates.push(candidate);
      } catch (_) {
        // A leap month does not exist in every lunar year; try the next year.
      }
    }
    candidates.sort((a, b) => a - b);
    if (candidates[0]) return candidates[0];
    throw new Error('无法计算该农历纪念日的下一次日期');
  }

  const original = parseDateOnly(memorial.date);
  const month = original.getMonth() + 1;
  const day = original.getDate();
  let candidate = solarOccurrence(today.getFullYear(), month, day);
  if (candidate < today) candidate = solarOccurrence(today.getFullYear() + 1, month, day);
  return candidate;
}

export function getDaysUntil(target, from = new Date()) {
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((targetUtc - fromUtc) / 86400000);
}

export function getOccurrenceText(memorial, from = new Date()) {
  const nextDate = getNextOccurrence(memorial, from);
  const diffDays = getDaysUntil(nextDate, from);
  if (diffDays === 0) return { text: '今天', isSoon: true, diffDays, nextDate };
  if (diffDays === 1) return { text: '明天', isSoon: true, diffDays, nextDate };
  if (diffDays > 1) return { text: `还有${diffDays}天`, isSoon: false, diffDays, nextDate };
  return { text: `已过${Math.abs(diffDays)}天`, isSoon: false, diffDays, nextDate };
}

export function formatMemorialDate(memorial) {
  if (memorial.isLunar) {
    const { lunarMonth, lunarDay, lunarLeap } = lunarFields(memorial);
    const monthText = LUNAR_MONTHS[lunarMonth - 1] || String(lunarMonth);
    const dayText = LUNAR_DAYS[lunarDay - 1] || String(lunarDay);
    return `农历${lunarLeap ? '闰' : ''}${monthText}月${dayText}`;
  }
  const date = parseDateOnly(memorial.date);
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
}
