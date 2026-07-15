import React, { useState } from 'react';

export default function ExportImportBar({ onRefresh, onError }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      setBusy(true);
      const ok = await window.memorialAPI.exportData();
      setMsg(ok ? '导出成功' : '已取消');
    } catch (error) {
      onError?.(error.message || '导出失败');
    } finally {
      setBusy(false);
    }
    setTimeout(() => setMsg(''), 2000);
  };

  const handleImport = async () => {
    try {
      setBusy(true);
      const count = await window.memorialAPI.importData();
      if (count > 0) {
        setMsg(`已导入 ${count} 条新记录`);
        await onRefresh();
      } else {
        setMsg('没有新记录需要导入，或已取消');
      }
    } catch (error) {
      onError?.(error.message || '导入失败');
    } finally {
      setBusy(false);
    }
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="export-import-bar">
      {msg && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 'auto' }}>{msg}</span>}
      <button className="btn-export" onClick={handleExport} disabled={busy}>导出备份</button>
      <button className="btn-import" onClick={handleImport} disabled={busy}>导入数据</button>
    </div>
  );
}
