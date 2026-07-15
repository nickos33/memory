import React, { useState, useEffect, useCallback } from 'react';
import CardList from './components/CardList.js';
import SearchBar, { DEFAULT_TAGS } from './components/SearchBar.js';
import AddEditForm from './components/AddEditForm.js';
import ConfirmDialog from './components/ConfirmDialog.js';
import ExportImportBar from './components/ExportImportBar.js';
import { filterByTags, getNextOccurrence, getOccurrenceText } from './utils/helpers.js';

export default function App() {
  const [memorials, setMemorials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTags, setCustomTags] = useState([...DEFAULT_TAGS]);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await window.memorialAPI.getAll();
      setMemorials(data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || '读取纪念日数据失败');
    }
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
        !m.reason.toLowerCase().includes(q) &&
        !(m.notes || '').toLowerCase().includes(q)
      ) return false;
    }
    return filterByTags([m], selectedTags).length > 0;
  });

  const nextMemory = [...memorials]
    .sort((a, b) => getNextOccurrence(a) - getNextOccurrence(b))[0];
  const nextMemoryText = nextMemory ? getOccurrenceText(nextMemory).text : '从今天开始记录';

  const handleAdd = () => { setEditingItem(null); setShowForm(true); };
  const handleEdit = (item) => { setEditingItem(item); setShowForm(true); };

  const handleSave = async (formData) => {
    try {
      if (editingItem) {
        await window.memorialAPI.update(editingItem.id, formData);
      } else {
        await window.memorialAPI.add(formData);
      }
      setShowForm(false);
      setEditingItem(null);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || '保存失败');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await window.memorialAPI.delete(deleteTarget.id);
        setDeleteTarget(null);
        await loadData();
      } catch (error) {
        setErrorMessage(error.message || '删除失败');
      }
    }
  };

  const handleTogglePin = async (id) => {
    try {
      await window.memorialAPI.togglePin(id);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || '置顶操作失败');
    }
  };

  const handleReorder = async (orderedIds) => {
    try {
      await window.memorialAPI.reorder(orderedIds);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || '排序保存失败');
    }
  };

  const handleDeleteTag = (tag) => {
    setCustomTags((prev) => prev.filter((t) => t !== tag));
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-kicker">珍藏每一个重要时刻</span>
          <h1 className="memorials-title">Memory</h1>
        </div>
        <div className="header-actions">
          <button
            className="btn-widget-toggle"
            onClick={() => window.widgetAPI?.toggleWidget?.()}
            title="显示或隐藏纪念日小组件"
            aria-label="显示或隐藏纪念日小组件"
          >
            面板
          </button>
          <button
            className={`btn-search ${searchOpen ? 'active' : ''}`}
            onClick={() => setSearchOpen(!searchOpen)}
            aria-expanded={searchOpen}
          >
            搜索
          </button>
          <button className="btn-add" onClick={handleAdd}>＋ 新增</button>
        </div>
      </header>
      <section className="next-memory" aria-label="下一个重要日子">
        <p className="next-memory-label">值得期待的日子</p>
        <strong>{nextMemoryText}</strong>
        <span>{nextMemory ? `${nextMemory.name} · ${nextMemory.reason}` : '添加第一条纪念日，留住属于你的故事'}</span>
      </section>
      {errorMessage && (
        <div className="app-error" role="alert">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} aria-label="关闭错误提示">×</button>
        </div>
      )}
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
        emptyMessage={memorials.length > 0 ? '没有符合条件的纪念日' : ''}
      />
      <ExportImportBar onRefresh={loadData} onError={setErrorMessage} />
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
