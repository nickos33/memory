import React from 'react';
import { DEFAULT_TAGS } from '../utils/helpers.js';

export default function SearchBar({ value, onChange, selectedTags, onTagsChange, customTags, onDeleteTag, open }) {
  const allTags = customTags && customTags.length > 0 ? customTags : DEFAULT_TAGS;

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <>
      <div className={`search-bar ${open ? '' : 'collapsed'}`}>
        <input
          type="text"
          placeholder="搜索人名、事由..."
          aria-label="搜索人名、事由或备注"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button className="search-clear" onClick={() => onChange('')} aria-label="清空搜索">✕</button>
        )}
      </div>
      <div className="tag-filter">
        {allTags.map((tag) => (
          <button
            key={tag}
            className={`tag-filter-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
            onClick={() => toggleTag(tag)}
            aria-pressed={selectedTags.includes(tag)}
          >
            {tag}
            {onDeleteTag && !DEFAULT_TAGS.includes(tag) && (
              <span className="tag-delete" role="button" aria-label={`删除标签 ${tag}`} onClick={(e) => { e.stopPropagation(); onDeleteTag(tag); }}>×</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

export { DEFAULT_TAGS };
