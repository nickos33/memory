export {
  deriveLunarFields,
  formatDateOnly,
  formatMemorialDate,
  getNextOccurrence,
  getOccurrenceText,
  lunarDateToSolar,
} from '../../shared/memorial-date.mjs';

export const DEFAULT_TAGS = ['家庭', '工作', '朋友', '恋爱', '重要'];
export const DEFAULT_REASONS = ['生日', '结婚纪念日', '恋爱纪念日', '忌日', '祭日', '毕业纪念日', '入职纪念日', '其他'];

export function filterByTags(items, selectedTags) {
  if (!selectedTags || selectedTags.length === 0) return items;
  return items.filter((item) => {
    if (!item.tags || item.tags.length === 0) return false;
    return selectedTags.some((tag) => item.tags.includes(tag));
  });
}
