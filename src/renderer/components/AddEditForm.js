import React, { useEffect, useState } from 'react';
import {
  DEFAULT_TAGS,
  DEFAULT_REASONS,
  deriveLunarFields,
  formatDateOnly,
  lunarDateToSolar,
} from '../utils/helpers.js';

const todayValue = () => formatDateOnly(new Date());

export default function AddEditForm({ item, onSave, onClose }) {
  const fallbackLunar = deriveLunarFields(item?.date || todayValue());
  const [reasons, setReasons] = useState(() => {
    const base = [...DEFAULT_REASONS];
    if (item?.reason && !base.includes(item.reason)) base.push(item.reason);
    return base;
  });
  const [tags, setTags] = useState(() => {
    const base = [...DEFAULT_TAGS];
    if (item?.tags) item.tags.forEach((tag) => { if (!base.includes(tag)) base.push(tag); });
    return base;
  });
  const [tagInput, setTagInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: item?.name || '',
    date: item?.date || todayValue(),
    reason: item?.reason || '生日',
    notes: item?.notes || '',
    isLunar: Boolean(item?.isLunar),
    recurrence: item?.recurrence || 'yearly',
    lunarYear: item?.lunarYear || fallbackLunar.lunarYear,
    lunarMonth: item?.lunarMonth || fallbackLunar.lunarMonth,
    lunarDay: item?.lunarDay || fallbackLunar.lunarDay,
    lunarLeap: Boolean(item?.lunarLeap ?? fallbackLunar.lunarLeap),
    selectedTags: item?.tags || [],
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: '', submit: '' }));
  };

  const toggleTag = (tag) => {
    setForm((previous) => ({
      ...previous,
      selectedTags: previous.selectedTags.includes(tag)
        ? previous.selectedTags.filter((entry) => entry !== tag)
        : [...previous.selectedTags, tag],
    }));
  };

  const addCustomTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) {
      setTags((previous) => [...previous, value]);
      setForm((previous) => ({ ...previous, selectedTags: [...previous.selectedTags, value] }));
    }
    setTagInput('');
  };

  const addCustomReason = () => {
    const value = reasonInput.trim();
    if (value && !reasons.includes(value)) {
      setReasons((previous) => [...previous, value]);
      handleChange('reason', value);
    }
    setReasonInput('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = '请输入人名';
    if (!form.reason.trim()) nextErrors.reason = '请选择或输入事由';
    if (!form.isLunar && !form.date) nextErrors.date = '请选择日期';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setSaving(true);
      let date = form.date;
      if (form.isLunar) {
        date = formatDateOnly(lunarDateToSolar(
          Number(form.lunarYear),
          Number(form.lunarMonth),
          Number(form.lunarDay),
          form.lunarLeap
        ));
      }
      await onSave({
        name: form.name,
        date,
        reason: form.reason,
        notes: form.notes,
        tags: form.selectedTags,
        isLunar: form.isLunar,
        recurrence: form.recurrence,
        ...(form.isLunar
          ? {
              lunarYear: Number(form.lunarYear),
              lunarMonth: Number(form.lunarMonth),
              lunarDay: Number(form.lunarDay),
              lunarLeap: form.lunarLeap,
            }
          : {}),
      });
    } catch (error) {
      setErrors((previous) => ({ ...previous, submit: error.message || '保存失败' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose} role="presentation">
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="memorial-form-title">
        <div className="modal-header">
          <h2 id="memorial-form-title">{item ? '编辑纪念日' : '新增纪念日'}</h2>
          <button className="modal-close" onClick={onClose} disabled={saving} aria-label="关闭表单">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="memorial-name">人名 *</label>
            <input id="memorial-name" type="text" value={form.name} onChange={(event) => handleChange('name', event.target.value)} autoFocus />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <span className="form-label">日期类型</span>
            <div className="segmented-control">
              <button type="button" className={!form.isLunar ? 'selected' : ''} onClick={() => handleChange('isLunar', false)}>公历</button>
              <button type="button" className={form.isLunar ? 'selected' : ''} onClick={() => handleChange('isLunar', true)}>农历</button>
            </div>
          </div>

          {form.isLunar ? (
            <div className="form-group">
              <span className="form-label">农历日期 *</span>
              <div className="lunar-fields">
                <input aria-label="农历年份" type="number" min="1900" max="2100" value={form.lunarYear} onChange={(event) => handleChange('lunarYear', Number(event.target.value))} />
                <select aria-label="农历月份" value={form.lunarMonth} onChange={(event) => handleChange('lunarMonth', Number(event.target.value))}>
                  {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}月</option>)}
                </select>
                <select aria-label="农历日期" value={form.lunarDay} onChange={(event) => handleChange('lunarDay', Number(event.target.value))}>
                  {Array.from({ length: 30 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}日</option>)}
                </select>
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.lunarLeap} onChange={(event) => handleChange('lunarLeap', event.target.checked)} />
                闰月
              </label>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="memorial-date">公历日期 *</label>
              <input id="memorial-date" type="date" value={form.date} onChange={(event) => handleChange('date', event.target.value)} />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="memorial-recurrence">重复规则</label>
            <select id="memorial-recurrence" value={form.recurrence} onChange={(event) => handleChange('recurrence', event.target.value)}>
              <option value="yearly">每年重复</option>
              <option value="once">仅一次</option>
            </select>
          </div>

          <div className="form-group">
            <span className="form-label">事由 *</span>
            <div className="reason-options">
              {reasons.map((reason) => (
                <button key={reason} type="button" className={`reason-chip ${form.reason === reason ? 'selected' : ''}`} onClick={() => handleChange('reason', reason)}>{reason}</button>
              ))}
            </div>
            <div className="inline-add">
              <input type="text" value={reasonInput} onChange={(event) => setReasonInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomReason(); } }} placeholder="自定义事由…" />
              <button type="button" className="btn-save btn-compact" onClick={addCustomReason}>添加</button>
            </div>
            {errors.reason && <span className="form-error">{errors.reason}</span>}
          </div>

          <div className="form-group">
            <span className="form-label">标签</span>
            <div className="tag-select">
              {tags.map((tag) => (
                <button key={tag} type="button" className={`tag-option ${form.selectedTags.includes(tag) ? 'selected' : ''}`} onClick={() => toggleTag(tag)}>{tag}</button>
              ))}
            </div>
            <div className="inline-add">
              <input type="text" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomTag(); } }} placeholder="自定义标签…" />
              <button type="button" className="btn-save btn-compact" onClick={addCustomTag}>添加</button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="memorial-notes">备注</label>
            <textarea id="memorial-notes" value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} rows={3} />
          </div>

          {errors.submit && <div className="form-error form-submit-error" role="alert">{errors.submit}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>取消</button>
            <button type="submit" className="btn-save" disabled={saving}>{saving ? '保存中…' : item ? '保存修改' : '添加'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
