import { useStore } from '../hooks/useStore';
import { setActiveRound, deleteRound, exportRound } from '../store';
import { Play, Trash2, Download, CheckCircle2, XCircle } from 'lucide-react';
import { getCasesForModel, getResultKey } from '../store';

export function RoundList() {
  const { rounds, activeRoundId } = useStore();

  if (rounds.length === 0) {
    return (
      <div className="text-center text-fg-muted py-10">
        <p className="text-sm">尚未建立任何測試回合</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rounds.map(round => {
        const isActive = round.id === activeRoundId;
        let totalCases = 0;
        let pass = 0;
        let fail = 0;
        round.models.forEach(m => {
          const cases = getCasesForModel(m);
          totalCases += cases.length;
          cases.forEach(c => {
            const r = round.results[getResultKey(c.id, m)];
            if (r?.status === 'pass') pass++;
            else if (r?.status === 'fail') fail++;
          });
        });
        const done = Object.values(round.results).filter(r => r.status !== 'pending').length;
        const pct = totalCases > 0 ? Math.round((done / totalCases) * 100) : 0;

        return (
          <div
            key={round.id}
            className={`bg-surface rounded-lg border p-4 transition-colors cursor-pointer
              ${isActive ? 'border-blue-line border-l-4 border-l-blue-500' : 'border-border hover:border-border-strong'}`}
            onClick={() => setActiveRound(round.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isActive && <Play size={14} className="text-blue-ink" />}
                <h3 className="font-medium text-fg">{round.version}</h3>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => exportRound(round.id)}
                  className="p-1.5 rounded text-fg-subtle hover:text-fg hover:bg-surface-3"
                  title="匯出回合"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => { if (confirm(`確定刪除「${round.version}」回合？`)) deleteRound(round.id); }}
                  className="p-1.5 rounded text-fg-subtle hover:text-red-ink hover:bg-red-soft"
                  title="刪除回合"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-fg-muted mb-2">
              <span>{round.models.length} 個機型</span>
              <span>{totalCases} 個案例</span>
              <span className="flex items-center gap-1 text-emerald-ink"><CheckCircle2 size={12} /> {pass}</span>
              {fail > 0 && <span className="flex items-center gap-1 text-red-ink"><XCircle size={12} /> {fail}</span>}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct === 100 ? '#16a34a' : 'var(--color-primary)',
                  }}
                />
              </div>
              <span className="text-xs font-mono text-fg-subtle w-10 text-right">{pct}%</span>
            </div>

            <p className="text-xs text-fg-subtle mt-2">
              {new Date(round.createdAt).toLocaleDateString('zh-TW')} 建立
            </p>
          </div>
        );
      })}
    </div>
  );
}
