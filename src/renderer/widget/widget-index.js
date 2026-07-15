import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './Widget.css';
import { getNextOccurrence, getOccurrenceText } from '../../shared/memorial-date.mjs';

function Widget() {
  const [memorials, setMemorials] = useState([]);
  const [hiddenIds, setHiddenIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('widgetHiddenIds')) || []; }
    catch (_) { return []; }
  });

  const loadData = useCallback(async () => {
    const data = await window.memorialAPI.getAll();
    setMemorials(data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => window.widgetAPI?.onRefresh?.(loadData), [loadData]);

  useEffect(() => {
    return window.widgetAPI?.onRestoreAll?.(restoreAll);
  }, []);

  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const toggleHide = (id) => {
    setHiddenIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('widgetHiddenIds', JSON.stringify(next));
      return next;
    });
  };

  const restoreAll = () => {
    setHiddenIds([]);
    localStorage.setItem('widgetHiddenIds', JSON.stringify([]));
  };

  // Show ALL memorials (past + future), sort by date ascending
  const sorted = [...memorials]
    .filter((m) => !hiddenIds.includes(m.id))
    .sort((a, b) => getNextOccurrence(a) - getNextOccurrence(b));

  const handleClick = (id) => {
    window.widgetAPI.openMain();
  };

  return (
    <div className="widget-panel" onMouseDown={handleDragStart}>
      <div className="widget-header">
        <span className="widget-title" onClick={() => window.widgetAPI.openMain()}>Memory</span>
      </div>
      <div className="widget-list">
        {sorted.length === 0 ? (
          <div className="widget-empty">暂无纪念日</div>
        ) : (
          sorted.map((m) => {
            const occurrence = getOccurrenceText(m);
            const cd = occurrence.diffDays === 0
              ? '今天'
              : occurrence.diffDays === 1
                ? '明天'
                : occurrence.diffDays > 1
                  ? `${occurrence.diffDays} 天后`
                  : `${Math.abs(occurrence.diffDays)} 天前`;
            const isPast = occurrence.diffDays < 0;
            const isSoon = occurrence.isSoon;
            return (
              <div
                key={m.id}
                className={`widget-item ${isPast ? 'past' : ''}`}
                onClick={() => handleClick(m.id)}
                onContextMenu={(e) => { e.preventDefault(); toggleHide(m.id); }}
              >
                <div className="widget-item-row">
                  <span className="widget-item-name">{m.name}</span>
                  <span className={`widget-item-countdown ${isSoon ? 'soon' : ''} ${isPast ? 'past-countdown' : ''}`}>
                    {cd}
                  </span>
                </div>
                <div className="widget-item-meta">{m.reason}</div>
              </div>
            );
          })
        )}
        {hiddenIds.length > 0 && (
          <div className="widget-hidden-bar">
            <span className="widget-hidden-text" onClick={restoreAll}>
              已隐藏 {hiddenIds.length} 个 · 点击恢复全部
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

let dragging = false;
let dragStartX = 0;
let dragStartY = 0;

function handleDragStart(e) {
  if (e.target.tagName === 'BUTTON') return;
  dragging = true;
  dragStartX = e.screenX;
  dragStartY = e.screenY;

  const onMove = (ev) => {
    if (!dragging) return;
    const dx = ev.screenX - dragStartX;
    const dy = ev.screenY - dragStartY;
    dragStartX = ev.screenX;
    dragStartY = ev.screenY;
    window.widgetAPI.move(dx, dy);
  };

  const onUp = () => {
    dragging = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

const root = createRoot(document.getElementById('root'));
root.render(<Widget />);
