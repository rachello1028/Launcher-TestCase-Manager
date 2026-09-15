import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import type { CategoryId, TestStep, TestCase } from '../types';
import { addCase, updateCase, deleteCase, getCategoryLabel, getAllCategoryIds, addCategory, updateCategory, deleteCategory } from '../store';
import { Plus, Pencil, Trash2, X, Save, Tag, GripVertical, ListChecks } from 'lucide-react';

export function ScriptCaseManager() {
  const { masterCases } = useStore();
  const allCatIds = getAllCategoryIds();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCatManager, setShowCatManager] = useState(false);

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
        <div className="flex gap-2 overflow-x-auto flex-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors flex-shrink-0 cursor-pointer
              ${filter === 'all' ? 'bg-blue-soft text-blue-ink border-blue-line' : 'bg-surface text-fg-muted border-border hover:bg-surface-3'}`}
          >
            全部 ({masterCases.length})
          </button>
          {allCatIds.map(cat => {
            const count = masterCases.filter(c => c.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors flex-shrink-0 cursor-pointer
                  ${filter === cat ? 'bg-blue-soft text-blue-ink border-blue-line' : 'bg-surface text-fg-muted border-border hover:bg-surface-3'}`}
              >
                {getCategoryLabel(cat)} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowCatManager(true)}
            className="btn-secondary px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Tag size={16} /> 管理分類
          </button>
          <button
            onClick={() => { setShowAdd(true); setEditId(null); }}
            className="btn-primary px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} /> 新增案例
          </button>
        </div>
      </div>

      {showCatManager && <CategoryManager onClose={() => setShowCatManager(false)} />}
      {showAdd && <ScriptCaseForm onClose={() => setShowAdd(false)} />}
      {editId && <ScriptCaseForm initial={masterCases.find(c => c.id === editId)} onClose={() => setEditId(null)} />}

      {/* Case list */}
      {masterCases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-fg-muted">
          <ListChecks size={40} className="mb-3 text-fg-subtle" />
          <p className="text-sm">尚未建立任何腳本案例，點右上「新增案例」開始</p>
        </div>
      )}

      {(Object.keys(grouped) as CategoryId[]).map(cat => (
        <div key={cat} className="bg-surface rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium text-fg">{getCategoryLabel(cat)}</h3>
          </div>
          <div className="divide-y divide-border">
            {grouped[cat].map(c => (
              <div key={c.id} className="px-4 py-3 group">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-fg font-medium">{c.name}</span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-3 text-fg-subtle inline-flex items-center gap-1">
                        <ListChecks size={11} /> {c.steps?.length || 0} 步驟
                      </span>
                      {c.environments?.map(env => (
                        <span key={env} className="text-[11px] px-1.5 py-0.5 rounded bg-blue-soft text-blue-ink">{env}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => { setEditId(c.id); setShowAdd(false); }} className="p-1.5 rounded text-fg-subtle hover:text-fg hover:bg-surface-3 cursor-pointer" title="編輯案例">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`確定刪除「${c.name}」？`)) deleteCase(c.id); }}
                      className="p-1.5 rounded text-fg-subtle hover:text-red-ink hover:bg-red-soft cursor-pointer"
                      title="刪除案例"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScriptCaseForm({ initial, onClose }: { initial?: TestCase; onClose: () => void }) {
  const allCatIds = getAllCategoryIds();
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState<CategoryId>(initial?.category || allCatIds[0] || 'general');
  const [precondition, setPrecondition] = useState(initial?.precondition || '');
  const [steps, setSteps] = useState<TestStep[]>(
    initial?.steps?.length ? initial.steps : [{ id: `s_${Date.now()}`, action: '', expected: '' }]
  );
  const [envText, setEnvText] = useState((initial?.environments || []).join('、'));

  const addStep = () => setSteps(s => [...s, { id: `s_${Date.now()}_${s.length}`, action: '', expected: '' }]);
  const removeStep = (id: string) => setSteps(s => s.length > 1 ? s.filter(x => x.id !== id) : s);
  const updateStep = (id: string, field: 'action' | 'expected', val: string) =>
    setSteps(s => s.map(x => x.id === id ? { ...x, [field]: val } : x));

  const handleSave = () => {
    if (!name.trim() || !category) return;
    const cleanSteps = steps.filter(s => s.action.trim() || s.expected.trim());
    const environments = envText.split(/[、,，]/).map(e => e.trim()).filter(Boolean);
    const payload = {
      name: name.trim(),
      category,
      precondition: precondition.trim() || undefined,
      steps: cleanSteps,
      environments: environments.length ? environments : undefined,
    };
    if (initial) {
      updateCase(initial.id, payload);
    } else {
      addCase({ id: `sc_${Date.now()}`, models: [], ...payload });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="bg-surface-2 border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-2 z-10">
          <h2 className="text-lg font-semibold text-fg">{initial ? '編輯腳本案例' : '新增腳本案例'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg cursor-pointer" title="關閉">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-fg-muted mb-1.5">案例名稱</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：新增信用卡交易流程"
                className="w-full px-3 py-2 rounded-md border border-border-strong text-sm"
                autoFocus
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-fg-muted mb-1.5">分類</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-md border border-border-strong text-sm">
                {allCatIds.map(cat => <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">前置條件<span className="text-fg-subtle font-normal">（可選）</span></label>
            <textarea
              value={precondition}
              onChange={e => setPrecondition(e.target.value)}
              placeholder="例：已完成參數下載、端末機已連線"
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-border-strong text-sm resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">適用環境<span className="text-fg-subtle font-normal">（可選，用「、」分隔）</span></label>
            <input
              type="text"
              value={envText}
              onChange={e => setEnvText(e.target.value)}
              placeholder="例：A930、Android 13"
              className="w-full px-3 py-2 rounded-md border border-border-strong text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-fg-muted">測試步驟</label>
              <span className="text-xs text-fg-subtle">{steps.length} 步</span>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={step.id} className="flex gap-2 items-start bg-surface rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-1 pt-2 text-fg-subtle">
                    <GripVertical size={14} className="opacity-40" />
                    <span className="text-xs font-mono w-4 text-center">{i + 1}</span>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <textarea
                      value={step.action}
                      onChange={e => updateStep(step.id, 'action', e.target.value)}
                      placeholder="操作步驟"
                      rows={2}
                      className="px-2.5 py-1.5 rounded-md border border-border-strong text-sm resize-y"
                    />
                    <textarea
                      value={step.expected}
                      onChange={e => updateStep(step.id, 'expected', e.target.value)}
                      placeholder="預期結果"
                      rows={2}
                      className="px-2.5 py-1.5 rounded-md border border-border-strong text-sm resize-y"
                    />
                  </div>
                  <button
                    onClick={() => removeStep(step.id)}
                    disabled={steps.length <= 1}
                    className="p-1.5 mt-0.5 rounded text-fg-subtle hover:text-red-ink hover:bg-red-soft disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="刪除步驟"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addStep}
              className="mt-2 w-full py-2 rounded-md border border-dashed border-border-strong text-sm text-fg-muted hover:bg-surface-3 hover:text-fg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} /> 新增步驟
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-surface-2">
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-md text-sm font-medium cursor-pointer">取消</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-primary px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save size={16} /> {initial ? '更新' : '建立案例'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryManager({ onClose }: { onClose: () => void }) {
  const { categories, masterCases } = useStore();
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = label.replace(/[\s/]+/g, '_').replace(/[^a-zA-Z0-9_一-鿿]/g, '').toLowerCase() || `cat_${Date.now()}`;
    addCategory(id, label);
    setNewLabel('');
  };

  const handleDelete = (catId: string, label: string) => {
    const count = masterCases.filter(c => c.category === catId).length;
    const msg = count > 0 ? `刪除分類「${label}」會同時刪除底下 ${count} 筆案例，確定？` : `確定刪除分類「${label}」？`;
    if (confirm(msg)) deleteCategory(catId);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/50">
      <div className="bg-surface-2 border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-fg">管理分類</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg cursor-pointer" title="關閉"><X size={18} /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="新分類名稱"
            className="flex-1 px-3 py-2 rounded-md border border-border-strong text-sm"
          />
          <button onClick={handleAdd} disabled={!newLabel.trim()} className="btn-primary px-3 py-2 rounded-md text-sm font-medium disabled:opacity-40 cursor-pointer">新增</button>
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {categories.map(cat => {
            const count = masterCases.filter(c => c.category === cat.id).length;
            const isEditing = editingId === cat.id;
            return (
              <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-3 group">
                {isEditing ? (
                  <>
                    <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && (updateCategory(cat.id, editLabel.trim()), setEditingId(null))} className="flex-1 px-2 py-1 rounded border border-border-strong text-sm" autoFocus />
                    <button onClick={() => { if (editLabel.trim()) { updateCategory(cat.id, editLabel.trim()); setEditingId(null); } }} className="p-1 rounded text-emerald-ink hover:bg-emerald-soft cursor-pointer"><Save size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded text-fg-subtle hover:bg-surface-3 cursor-pointer"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-fg">{cat.label}</span>
                    <span className="text-xs text-fg-subtle font-mono">{count} 筆</span>
                    <button onClick={() => { setEditingId(cat.id); setEditLabel(cat.label); }} className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-surface-3 opacity-0 group-hover:opacity-100 cursor-pointer"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(cat.id, cat.label)} className="p-1 rounded text-fg-subtle hover:text-red-ink hover:bg-red-soft opacity-0 group-hover:opacity-100 cursor-pointer"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-md text-sm font-medium cursor-pointer">關閉</button>
        </div>
      </div>
    </div>
  );
}
