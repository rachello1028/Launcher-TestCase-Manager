import { useState, useRef, useEffect } from 'react';
import type { TestMode } from '../types';
import { useApp } from '../hooks/useStore';
import { createProject, setActiveProject, updateProject, deleteProject } from '../store';
import { ChevronDown, Plus, Check, X, Pencil, Trash2, LayoutGrid, ListChecks, Save } from 'lucide-react';

const MODE_META: Record<TestMode, { label: string; icon: typeof LayoutGrid }> = {
  matrix: { label: '機種矩陣', icon: LayoutGrid },
  script: { label: '步驟腳本', icon: ListChecks },
};

export function ProjectSwitcher() {
  const { projects, activeProjectId } = useApp();
  const active = projects.find(p => p.id === activeProjectId) || projects[0];
  const [open, setOpen] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!active) return null;
  const ActiveIcon = MODE_META[active.testMode].icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md bg-surface border border-border text-sm font-medium text-fg hover:bg-surface-3 transition-colors"
        title="切換專案"
      >
        <ActiveIcon size={14} className="text-fg-subtle" />
        <span className="max-w-[140px] truncate">{active.name}</span>
        <ChevronDown size={14} className="text-fg-subtle" />
      </button>

      {open && (
        <div className="absolute left-0 top-[34px] z-50 w-64 bg-surface-2 border border-border rounded-lg shadow-xl py-1.5">
          <div className="px-3 py-1 text-[11px] font-medium text-fg-subtle uppercase tracking-wide">專案</div>
          <div className="max-h-72 overflow-y-auto">
            {projects.map(p => {
              const Icon = MODE_META[p.testMode].icon;
              const isActive = p.id === active.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setActiveProject(p.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-3 transition-colors
                    ${isActive ? 'text-fg font-medium' : 'text-fg-muted'}`}
                >
                  <Icon size={14} className="text-fg-subtle flex-shrink-0" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] text-fg-subtle">{MODE_META[p.testMode].label}</span>
                  {isActive && <Check size={14} className="text-blue-ink flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border mt-1.5 pt-1.5 flex flex-col">
            <button
              onClick={() => { setShowManage(true); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-fg-muted hover:bg-surface-3 hover:text-fg transition-colors"
            >
              <Pencil size={14} /> 管理專案
            </button>
          </div>
        </div>
      )}

      {showManage && <ProjectManager onClose={() => setShowManage(false)} />}
    </div>
  );
}

function ProjectManager({ onClose }: { onClose: () => void }) {
  const { projects } = useApp();
  const [newName, setNewName] = useState('');
  const [newMode, setNewMode] = useState<TestMode>('matrix');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    createProject(newName.trim(), newMode);
    setNewName('');
    setNewMode('matrix');
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateProject(id, { name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (projects.length <= 1) { alert('至少要保留一個專案'); return; }
    if (confirm(`確定刪除專案「${name}」？該專案的所有機種、案例、測試回合都會一併刪除，無法復原。`)) {
      deleteProject(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50">
      <div className="bg-surface-2 border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-fg">管理專案</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        {/* 新增專案 */}
        <div className="bg-surface rounded-lg border border-border p-4 mb-4">
          <label className="block text-sm font-medium text-fg-muted mb-2">新增專案</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="專案名稱（例：A930 收銀機）"
              className="flex-1 px-3 py-2 rounded-md border border-border-strong text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="btn-primary px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus size={16} /> 新增
            </button>
          </div>
          <div className="flex gap-2">
            {(['matrix', 'script'] as TestMode[]).map(mode => {
              const Icon = MODE_META[mode].icon;
              const selected = newMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setNewMode(mode)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors
                    ${selected ? 'bg-blue-soft border-blue-line text-blue-ink' : 'bg-surface-2 border-border text-fg-muted hover:bg-surface-3'}`}
                >
                  <Icon size={15} />
                  <div className="text-left">
                    <div className="font-medium">{MODE_META[mode].label}</div>
                    <div className="text-[10px] opacity-70">{mode === 'matrix' ? '機種 × 案例 pass/fail' : '步驟 / 預期 / 實際結果'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 專案清單 */}
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {projects.map(p => {
            const Icon = MODE_META[p.testMode].icon;
            const isEditing = editingId === p.id;
            return (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-3 group">
                <Icon size={15} className="text-fg-subtle flex-shrink-0" />
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUpdate(p.id)}
                      className="flex-1 px-2 py-1 rounded border border-border-strong text-sm"
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(p.id)} className="p-1 rounded text-emerald-ink hover:bg-emerald-soft">
                      <Save size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded text-fg-subtle hover:bg-surface-3">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-fg truncate">{p.name}</span>
                    <span className="text-[10px] text-fg-subtle">{MODE_META[p.testMode].label}</span>
                    <button
                      onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                      className="p-1 rounded text-fg-subtle hover:text-fg hover:bg-surface-3 opacity-0 group-hover:opacity-100"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1 rounded text-fg-subtle hover:text-red-ink hover:bg-red-soft opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-md text-sm font-medium">關閉</button>
        </div>
      </div>
    </div>
  );
}
