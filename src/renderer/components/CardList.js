import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Card from './Card.js';
import { formatMemorialDate } from '../utils/helpers.js';

export default function CardList({ items, onEdit, onDelete, onTogglePin, onReorder, emptyMessage }) {
  const [activeId, setActiveId] = React.useState(null);
  const activeItem = items.find((m) => m.id === activeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event) => setActiveId(event.active.id);
  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const source = items.find((entry) => entry.id === active.id);
    const target = items.find((entry) => entry.id === over.id);
    if (!source || !target || Boolean(source.pinned) !== Boolean(target.pinned)) return;

    const oldIndex = items.findIndex((m) => m.id === active.id);
    const newIndex = items.findIndex((m) => m.id === over.id);
    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered.map((m) => m.id));
  };

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📅</div>
        <p>{emptyMessage || '还没有纪念日'}</p>
        {!emptyMessage && <p className="empty-sub">点击右上角「+ 新增」添加第一个吧</p>}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div className="card-list">
          {items.map((item) => (
            <Card
              key={item.id}
              item={item}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
              onTogglePin={() => onTogglePin(item.id)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="card card-drag-overlay card-pinned">
            <div className="card-top">
              <span className="btn-pin pinned">📌</span>
            </div>
            <div className="card-body">
              <div className="card-date-row">
                <span className="card-date-text">{formatMemorialDate(activeItem)}</span>
              </div>
              <h3 className="card-name">{activeItem.name}</h3>
              <p className="card-reason">{activeItem.reason}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
