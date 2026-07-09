import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { addModel, updateModel, deleteModel } from '../store';
import { Plus, Pencil, Trash2, X, Save, Smartphone } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function ModelManager({ onClose }: Props) {
  const { models, masterCases } = useStore();
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const id = newId.trim() || newLabel.trim().replace(/[\s.]+/g, '_');
    const ok = addModel(id, newLabel.trim());
    if (ok) {
      setNewId('');
      setNewLabel('');
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editLabel.trim()) return;
    updateModel(id, editLabel.trim());
    setEditingId(null);
  };

  const handleDelete = (id: string, label: string) => {
    const caseCount = masterCases.filter(c => c.models.includes(id)).length;
    const msg = caseCount > 0
      ? `「${label}」有 ${caseCount} 個關聯案例，刪除後這些案例會移除此機型。確定刪除？`
      : `確定刪除「${label}」？`;
    if (confirm(msg)) deleteModel(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50">
      <div className="bg-surface-2 border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Smartphone size={20} className="text-fg-muted" />
            <h2 className="text-lg font-semibold text-fg">管理機型</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        {/* Add new */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="機型名稱（如 A920S OS14）"
            className="flex-1 px-2.5 py-2 rounded-md border border-border-strong text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={!newLabel.trim()}
            className="btn-primary px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 disabled:opacity-40"
          >
            <Plus size={16} /> 新增
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border">
          {models.map(m => {
            const caseCount = masterCases.filter(c => c.models.includes(m.id)).length;
            const isEditing = editingId === m.id;

            return (
              <div key={m.id} className="px-4 py-2.5 flex items-center gap-3 group">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(m.id)}
                      className="flex-1 px-2 py-1 rounded-md border border-border-strong text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(m.id)}
                      className="p-1 rounded text-emerald-ink hover:bg-emerald-soft"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded text-fg-subtle hover:bg-surface-3"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-fg">{m.label}</span>
                    <span className="text-xs text-fg-subtle font-mono">{caseCount} 案例</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(m.id); setEditLabel(m.label); }}
                        className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-surface-3"
                        title="重新命名"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id, m.label)}
                        className="p-1 rounded text-fg-subtle hover:text-red-ink hover:bg-red-soft"
                        title="刪除機型"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-fg-subtle mt-3">
          新增機型後，可在「案例管理」中將案例指定到新機型。
        </p>
      </div>
    </div>
  );
}
