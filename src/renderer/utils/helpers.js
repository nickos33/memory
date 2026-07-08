import { Lunar } from 'lunar-typescript';

export function formatDate(dateStr, isLunar) {
  if (!dateStr) return '';
  if (isLunar) {
    const d = new Date(dateStr);
    const lunar = Lunar.fromDate(d);
    return `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  }
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

export function daysSince(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((today - target) / (1000 * 60 * 60 * 24));
}

export function daysSinceText(dateStr) {
  const diff = daysSince(dateStr);
  if (diff === 0) return { text: '今天', isSoon: true };
  if (diff === -1) return { text: '明天', isSoon: true };
  if (diff < 0) return { text: `还有${Math.abs(diff)}天`, isSoon: false };
  if (diff > 0) return { text: `已过${diff}天`, isSoon: false };
  return { text: '', isSoon: false };
}

export const DEFAULT_TAGS = ['家庭', '工作', '朋友', '恋爱', '重要'];
export const DEFAULT_REASONS = ['生日', '结婚纪念日', '恋爱纪念日', '忌日', '祭日', '毕业纪念日', '入职纪念日', '其他'];

export function filterByTags(items, selectedTags) {
  if (!selectedTags || selectedTags.length === 0) return items;
  return items.filter((item) => {
    if (!item.tags || item.tags.length === 0) return false;
    return selectedTags.some((t) => item.tags.includes(t));
  });
}
