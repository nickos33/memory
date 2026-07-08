import React, { useState } from 'react';
import { DEFAULT_TAGS, DEFAULT_REASONS } from '../utils/helpers.js';

export default function AddEditForm({ item, onSave, onClose }) {
  const [reasons, setReasons] = useState(() => {
    const base = [...DEFAULT_REASONS];
    if (item?.reason && !base.includes(item.reason)) base.push(item.reason);
    return base;
  });
  const [tags, setTags] = useState(() => {
    const base = [...DEFAULT_TAGS];
    if (item?.tags) item.tags.forEach((t) => { if (!base.includes(t)) base.push(t); });
    return base;
  });
  const [tagInput, setTagInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  const [form, setForm] = useState({
    name: item?.name || '',
    date: item?.date || '',
    reason: item?.reason || '生日',
    notes: item?.notes || '',
    isLunar: item?.isLunar || false,
    selectedTags: item?.tags || [],
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  };

  const addCustomTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      setTags((prev) => [...prev, val]);
      setForm((prev) => ({ ...prev, selectedTags: [...prev.selectedTags, val] }));
    }
    setTagInput('');
  };

  const deleteTag = (tag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setForm((prev) => ({ ...prev, selectedTags: prev.selectedTags.filter((t) => t !== tag) }));
  };

  const addCustomReason = () => {
    const val = reasonInput.trim();
    if (val && !reasons.includes(val)) {
      setReasons((prev) => [...prev, val]);
      handleChange('reason', val);
    }
    setReasonInput('');
  };

  const deleteReason = (r) => {
    if (DEFAULT_REASONS.includes(r)) return;
    setReasons((prev) => prev.filter((x) => x !== r));
    if (form.reason === r) handleChange('reason', '生日');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = '请输入人名';
    if (!form.date) newErrors.date = '请选择日期';
    if (!form.reason.trim()) newErrors.reason = '请选择或输入事由';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave({ ...form, tags: form.selectedTags, selectedTags: undefined });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? '编辑纪念日' : '新增纪念日'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>人名 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="请输入人名"
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label>日期 *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              onClick={(e) => e.preventDefault()}
              onFocus={(e) => e.target.showPicker?.()}
            />
            <div className="lunar-toggle">
              <button
                type="button"
                className={`lunar-toggle-switch ${form.isLunar ? 'on' : ''}`}
                onClick={() => handleChange('isLunar', !form.isLunar)}
              />
              <span className="lunar-toggle-label">
                {form.isLunar ? '农历日期' : '公历日期'}
              </span>
            </div>
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>
          <div className="form-group">
            <label>事由 *</label>
            <div className="reason-options">
              {reasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`reason-chip ${form.reason === r ? 'selected' : ''}`}
                  onClick={() => handleChange('reason', r)}
                >
                  {r}
                  {!DEFAULT_REASONS.includes(r) && (
                    <span className="reason-delete" onClick={(e) => { e.stopPropagation(); deleteReason(r); }}>×</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomReason(); } }}
                placeholder="自定义事由..."
                className="reason-custom"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-save" style={{ padding: '6px 14px', fontSize: 12 }} onClick={addCustomReason}>添加</button>
            </div>
            {errors.reason && <span className="form-error">{errors.reason}</span>}
          </div>
          <div className="form-group">
            <label>标签</label>
            <div className="tag-select">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-option ${form.selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {!DEFAULT_TAGS.includes(tag) && (
                    <span className="reason-delete" onClick={(e) => { e.stopPropagation(); deleteTag(tag); }}>×</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                placeholder="自定义标签..."
                className="reason-custom"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-save" style={{ padding: '6px 14px', fontSize: 12 }} onClick={addCustomTag}>添加</button>
            </div>
          </div>
          <div className="form-group">
            <label>备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="附加备注信息..."
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>取消</button>
            <button type="submit" className="btn-save">{item ? '保存修改' : '添加'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
