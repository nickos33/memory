import React, { useState, useEffect, useCallback } from 'react';
import CardList from './components/CardList.js';
import SearchBar, { DEFAULT_TAGS } from './components/SearchBar.js';
import AddEditForm from './components/AddEditForm.js';
import ConfirmDialog from './components/ConfirmDialog.js';
import ExportImportBar from './components/ExportImportBar.js';
import { filterByTags } from './utils/helpers.js';

export default function App() {
  const [memorials, setMemorials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTags, setCustomTags] = useState([...DEFAULT_TAGS]);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async () => {
    const data = await window.memorialAPI.getAll();
    setMemorials(data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const allUsed = new Set(customTags);
    memorials.forEach((m) => { if (m.tags) m.tags.forEach((t) => allUsed.add(t)); });
    if (allUsed.size > customTags.length) setCustomTags([...allUsed]);
  }, [memorials]);

  const sorted = [...memorials].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const filtered = sorted.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !m.name.toLowerCase().includes(q) &&
        !m.reason.toLowerCase().includes(q)
      ) return false;
    }
    return filterByTags([m], selectedTags).length > 0;
  });

  const handleAdd = () => { setEditingItem(null); setShowForm(true); };
  const handleEdit = (item) => { setEditingItem(item); setShowForm(true); };

  const handleSave = async (formData) => {
    if (editingItem) {
      await window.memorialAPI.update(editingItem.id, formData);
    } else {
      await window.memorialAPI.add(formData);
    }
    setShowForm(false);
    setEditingItem(null);
    loadData();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await window.memorialAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    }
  };

  const handleTogglePin = async (id) => {
    await window.memorialAPI.togglePin(id);
    loadData();
  };

  const handleReorder = async (orderedIds) => {
    await window.memorialAPI.reorder(orderedIds);
    loadData();
  };

  const handleDeleteTag = (tag) => {
    setCustomTags((prev) => prev.filter((t) => t !== tag));
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="memorials-title">Memory</h1>
      </header>
      <div className="header-actions">
        <button
          className="btn-widget-toggle"
          onClick={() => window.widgetAPI?.toggleWidget?.()}
          title="显示/隐藏纪念日小组件"
        >
          📌 面板
        </button>
        <button
          className={`btn-search ${searchOpen ? 'active' : ''}`}
          onClick={() => setSearchOpen(!searchOpen)}
        >
          🔍 搜索
        </button>
        <button className="btn-add" onClick={handleAdd}>+ 新增</button>
      </div>
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        customTags={customTags}
        onDeleteTag={handleDeleteTag}
        open={searchOpen}
      />
      <CardList
        items={filtered}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
        onTogglePin={handleTogglePin}
        onReorder={handleReorder}
      />
      <ExportImportBar onRefresh={loadData} />
      {showForm && (
        <AddEditForm
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除「${deleteTarget.name}」的「${deleteTarget.reason}」吗？此操作不可恢复。`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
