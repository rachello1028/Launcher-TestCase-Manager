import { useState } from 'react';
import type { ModelId } from '../types';
import { createRound, getAllModelIds, getModelLabel } from '../store';
import { useStore } from '../hooks/useStore';
import { Plus, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function CreateRound({ onClose }: Props) {
  const { models } = useStore();
  const allIds = models.map(m => m.id);
  const [version, setVersion] = useState('Launcher v');
  const [selected, setSelected] = useState<Set<ModelId>>(new Set(allIds));

  const toggle = (m: ModelId) => {
    const next = new Set(selected);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(allIds));
  const selectNone = () => setSelected(new Set());

  const handleCreate = () => {
    if (!version.trim() || selected.size === 0) return;
    createRound(version.trim(), Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50">
      <div className="bg-surface-2 border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-fg">建立新測試回合</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1.5">版本號</label>
            <input
              type="text"
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="Launcher v1.034.03"
              className="w-full px-3 py-2 rounded-md border border-border-strong text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-fg-muted">選擇測試機型</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-blue-ink hover:underline">全選</button>
                <button onClick={selectNone} className="text-xs text-fg-subtle hover:underline">全不選</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allIds.map(m => (
                <label
                  key={m}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors text-sm
                    ${selected.has(m)
                      ? 'bg-blue-soft border-blue-line text-blue-ink'
                      : 'bg-surface border-border text-fg-muted hover:bg-surface-3'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(m)}
                    onChange={() => toggle(m)}
                    className="w-3.5 h-3.5"
                  />
                  {getModelLabel(m)}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-md text-sm font-medium">
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!version.trim() || selected.size === 0}
            className="btn-primary px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 disabled:opacity-40"
          >
            <Plus size={16} />
            建立回合
          </button>
        </div>
      </div>
    </div>
  );
}
