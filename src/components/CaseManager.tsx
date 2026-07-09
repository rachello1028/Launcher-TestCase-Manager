import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { CATEGORY_LABELS, type ModelId, type CategoryId } from '../types';
import { addCase, updateCase, deleteCase, getModelLabel } from '../store';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryId[];

export function CaseManager() {
  const { masterCases } = useStore();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = filter === 'all' ? masterCases : masterCases.filter(c => c.category === filter);
  const grouped: Record<CategoryId, typeof masterCases> = {} as any;
  filtered.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors flex-shrink-0
              ${filter === 'all' ? 'bg-blue-soft text-blue-ink border-blue-line' : 'bg-surface text-fg-muted border-border hover:bg-surface-3'}`}
          >
            全部 ({masterCases.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = masterCases.filter(c => c.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors flex-shrink-0
                  ${filter === cat ? 'bg-blue-soft text-blue-ink border-blue-line' : 'bg-surface text-fg-muted border-border hover:bg-surface-3'}`}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus size={16} /> 新增案例
        </button>
      </div>

      {/* Add form */}
      {showAdd && <CaseForm onSave={() => setShowAdd(false)} onCancel={() => setShowAdd(false)} />}

      {/* Case list */}
      {(Object.keys(grouped) as CategoryId[]).map(cat => (
        <div key={cat} className="bg-surface rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium text-fg">{CATEGORY_LABELS[cat]}</h3>
          </div>
          <div className="divide-y divide-border">
            {grouped[cat].map(c => (
              editId === c.id ? (
                <CaseForm
                  key={c.id}
                  initial={c}
                  onSave={() => setEditId(null)}
                  onCancel={() => setEditId(null)}
                />
              ) : (
                <div key={c.id} className="px-4 py-2.5 group">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-fg min-w-0">{c.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setEditId(c.id)} className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-surface-3">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`確定刪除「${c.name}」？`)) deleteCase(c.id); }}
                        className="p-1 rounded text-fg-subtle hover:text-red-ink hover:bg-red-soft"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap mt-1.5">
                    {c.models.map(m => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-fg-subtle font-medium">
                        {getModelLabel(m)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CaseForm({ initial, onSave, onCancel }: {
  initial?: { id: string; name: string; category: CategoryId; models: ModelId[] };
  onSave: () => void;
  onCancel: () => void;
}) {
  const store = useStore();
  const allIds = store.models.map(m => m.id);
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState<CategoryId>(initial?.category || 'params');
  const [models, setModels] = useState<Set<ModelId>>(new Set(initial?.models || allIds));

  const toggleModel = (m: ModelId) => {
    const next = new Set(models);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setModels(next);
  };

  const handleSave = () => {
    if (!name.trim() || models.size === 0) return;
    if (initial) {
      updateCase(initial.id, { name: name.trim(), category, models: Array.from(models) });
    } else {
      addCase({ id: `tc_${Date.now()}`, name: name.trim(), category, models: Array.from(models) });
    }
    onSave();
  };

  return (
    <div className="px-4 py-3 bg-blue-soft/30 border border-blue-line/30 rounded-lg space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="案例名稱"
          className="flex-1 px-2.5 py-1.5 rounded-md border border-border-strong text-sm"
          autoFocus
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value as CategoryId)}
          className="px-2.5 py-1.5 rounded-md border border-border-strong text-sm"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {allIds.map(m => (
          <label
            key={m}
            className={`text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors
              ${models.has(m)
                ? 'bg-blue-soft text-blue-ink border-blue-line'
                : 'bg-surface text-fg-muted border-border hover:bg-surface-3'
              }`}
          >
            <input type="checkbox" checked={models.has(m)} onChange={() => toggleModel(m)} className="sr-only" />
            {getModelLabel(m)}
          </label>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1">
          <X size={14} /> 取消
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || models.size === 0}
          className="btn-primary px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 disabled:opacity-40"
        >
          <Save size={14} /> {initial ? '更新' : '新增'}
        </button>
      </div>
    </div>
  );
}
