import React, { useEffect } from 'react';

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>取消</button>
          <button className="btn-delete-confirm" onClick={onConfirm}>确认删除</button>
        </div>
      </div>
    </div>
  );
}
