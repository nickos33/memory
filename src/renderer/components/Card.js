import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDate, daysSinceText } from '../utils/helpers.js';

export default function Card({ item, onEdit, onDelete, onTogglePin }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { text: countdownText, isSoon } = daysSinceText(item.date);

  return (
    <div
      className={`card ${item.pinned ? 'card-pinned' : ''} ${isDragging ? 'card-dragging' : ''}`}
      style={style}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    >
      <div className="card-top">
        <div className="card-hover-menu">
          <button
            className={`btn-pin ${item.pinned ? 'pinned' : ''}`}
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            title={item.pinned ? '取消置顶' : '置顶'}
          >
            📌
          </button>
          <button className="btn-icon-edit" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="编辑">
            ✎
          </button>
          <button className="btn-icon-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="删除">
            ✕
          </button>
        </div>
      </div>
      <div className="card-date-row">
        <span className="card-date-text">
          {formatDate(item.date, item.isLunar)}
        </span>
        {isSoon && <span className="card-date-badge">{countdownText}</span>}
        <span className={`card-countdown ${isSoon ? 'card-countdown-soon' : ''}`}>
          {countdownText}
        </span>
      </div>
      <h3 className="card-name">{item.name}</h3>
      <p className="card-reason">{item.reason}</p>
      {item.tags && item.tags.length > 0 && (
        <div className="card-tags">
          {item.tags.map((tag) => (
            <span key={tag} className="tag-chip">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
