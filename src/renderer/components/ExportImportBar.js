import React, { useState } from 'react';

export default function ExportImportBar({ onRefresh }) {
  const [msg, setMsg] = useState('');

  const handleExport = async () => {
    const ok = await window.memorialAPI.exportData();
    setMsg(ok ? '导出成功' : '已取消');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleImport = async () => {
    const count = await window.memorialAPI.importData();
    if (count > 0) {
      setMsg(`已导入 ${count} 条新记录`);
      onRefresh();
    } else if (count === 0) {
      setMsg('没有新记录需要导入');
    } else {
      setMsg('已取消');
    }
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="export-import-bar">
      {msg && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 'auto' }}>{msg}</span>}
      <button className="btn-export" onClick={handleExport}>📤 导出备份</button>
      <button className="btn-import" onClick={handleImport}>📥 导入数据</button>
    </div>
  );
}
