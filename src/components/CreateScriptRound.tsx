import { useState } from 'react';
import { createRound } from '../store';
import { Plus, X } from 'lucide-react';

export function CreateScriptRound({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState('');

  const handleCreate = () => {
    if (!version.trim()) return;
    createRound(version.trim(), []); // 腳本模式回合不綁機種
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50">
      <div className="bg-surface-2 border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-fg">建立測試回合</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg cursor-pointer" title="關閉">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-muted mb-1.5">版本 / 回合名稱</label>
          <input
            type="text"
            value={version}
            onChange={e => setVersion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="例：A930 v2.1.0 功能測試"
            className="w-full px-3 py-2 rounded-md border border-border-strong text-sm"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-md text-sm font-medium cursor-pointer">取消</button>
          <button onClick={handleCreate} disabled={!version.trim()} className="btn-primary px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
            <Plus size={16} /> 建立回合
          </button>
        </div>
      </div>
    </div>
  );
}
