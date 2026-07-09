import { useState, useRef } from 'react';
import { ThemeToggle } from './components/ThemeToggle';
import { Dashboard } from './components/Dashboard';
import { Checklist } from './components/Checklist';
import { CaseManager } from './components/CaseManager';
import { RoundList } from './components/RoundList';
import { CreateRound } from './components/CreateRound';
import { ModelManager } from './components/ModelManager';
import { exportAllData, importData } from './store';
import { useStore } from './hooks/useStore';
import { LayoutDashboard, ClipboardList, Settings, Plus, Download, Upload, FolderOpen, Smartphone } from 'lucide-react';

type Tab = 'dashboard' | 'checklist' | 'cases' | 'rounds';

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '統計總覽', icon: LayoutDashboard },
  { id: 'checklist', label: '測試 Checklist', icon: ClipboardList },
  { id: 'cases', label: '案例管理', icon: Settings },
  { id: 'rounds', label: '測試回合', icon: FolderOpen },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { activeRoundId, rounds } = useStore();
  const activeRound = rounds.find(r => r.id === activeRoundId);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(reader.result as string);
      if (ok) alert('匯入成功');
      else alert('匯入失敗：格式不正確');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-2 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-fg tracking-tight">Launcher Test Manager</h1>
              {activeRound && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-soft text-blue-ink border border-blue-line font-medium">
                  {activeRound.version}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCreate(true)}
                className="h-[34px] px-3 rounded-md text-sm font-medium bg-surface border border-border text-fg-muted hover:bg-surface-3 hover:text-fg transition-colors flex items-center gap-1.5"
              >
                <Plus size={16} /> 新回合
              </button>
              <button
                onClick={() => setShowModels(true)}
                className="h-[34px] px-2.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg transition-colors flex items-center"
                title="管理機型"
              >
                <Smartphone size={16} />
              </button>
              <button
                onClick={exportAllData}
                className="h-[34px] px-2.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg transition-colors flex items-center"
                title="匯出所有資料"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="h-[34px] px-2.5 rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg transition-colors flex items-center"
                title="匯入資料"
              >
                <Upload size={16} />
              </button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              <div className="w-px h-5 bg-border mx-0.5" />
              <ThemeToggle />
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 -mb-px">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                    ${active
                      ? 'border-primary text-fg'
                      : 'border-transparent text-fg-muted hover:text-fg hover:border-border-strong'
                    }`}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'checklist' && <Checklist />}
        {tab === 'cases' && <CaseManager />}
        {tab === 'rounds' && <RoundList />}
      </main>

      {showCreate && <CreateRound onClose={() => setShowCreate(false)} />}
      {showModels && <ModelManager onClose={() => setShowModels(false)} />}
    </div>
  );
}
