import { useStore } from '../hooks/useStore';
import { CATEGORY_LABELS, type CategoryId } from '../types';
import { getCasesForModel, getResultKey, getModelLabel } from '../store';
import { BarChart3, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function Dashboard() {
  const { rounds, activeRoundId } = useStore();
  const round = rounds.find(r => r.id === activeRoundId);

  if (!round) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-fg-muted">
        <BarChart3 size={48} className="mb-4 text-fg-subtle" />
        <p className="text-lg font-medium">尚未選擇測試回合</p>
        <p className="text-sm mt-1">請先建立或選擇一個測試回合</p>
      </div>
    );
  }

  const modelStats = round.models.map(modelId => {
    const cases = getCasesForModel(modelId);
    const total = cases.length;
    let pass = 0, fail = 0, skip = 0, pending = 0;
    cases.forEach(c => {
      const key = getResultKey(c.id, modelId);
      const r = round.results[key];
      if (!r || r.status === 'pending') pending++;
      else if (r.status === 'pass') pass++;
      else if (r.status === 'fail') fail++;
      else if (r.status === 'skip') skip++;
    });
    return { modelId, total, pass, fail, skip, pending };
  });

  const grandTotal = modelStats.reduce((s, m) => s + m.total, 0);
  const grandPass = modelStats.reduce((s, m) => s + m.pass, 0);
  const grandFail = modelStats.reduce((s, m) => s + m.fail, 0);
  const grandSkip = modelStats.reduce((s, m) => s + m.skip, 0);
  const grandDone = grandPass + grandFail + grandSkip;
  const overallPct = grandTotal > 0 ? Math.round((grandDone / grandTotal) * 100) : 0;

  const categoryBreakdown: Record<CategoryId, { total: number; pass: number; fail: number }> = {} as any;
  round.models.forEach(modelId => {
    const cases = getCasesForModel(modelId);
    cases.forEach(c => {
      if (!categoryBreakdown[c.category]) categoryBreakdown[c.category] = { total: 0, pass: 0, fail: 0 };
      categoryBreakdown[c.category].total++;
      const key = getResultKey(c.id, modelId);
      const r = round.results[key];
      if (r?.status === 'pass') categoryBreakdown[c.category].pass++;
      else if (r?.status === 'fail') categoryBreakdown[c.category].fail++;
    });
  });

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="bg-surface rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-fg">{round.version}</h2>
          <span className="text-sm text-fg-muted">
            建立於 {new Date(round.createdAt).toLocaleDateString('zh-TW')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <StatCard icon={<BarChart3 size={18} />} label="總案例數" value={grandTotal} color="blue" />
          <StatCard icon={<CheckCircle2 size={18} />} label="通過" value={grandPass} color="emerald" />
          <StatCard icon={<XCircle size={18} />} label="失敗" value={grandFail} color="red" />
          <StatCard icon={<Clock size={18} />} label="待測" value={grandTotal - grandDone} color="amber" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">整體完成度</span>
            <span className="font-mono font-medium text-fg">{overallPct}%</span>
          </div>
          <div className="h-2.5 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallPct}%`,
                backgroundColor: overallPct === 100 ? '#16a34a' : 'var(--color-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Per Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {modelStats.map(m => {
          const donePct = m.total > 0 ? Math.round(((m.pass + m.fail + m.skip) / m.total) * 100) : 0;
          const borderColor = m.fail > 0 ? 'border-l-red-500' : donePct === 100 ? 'border-l-emerald-500' : 'border-l-blue-500';
          return (
            <div key={m.modelId} className={`bg-surface rounded-lg border border-border border-l-4 ${borderColor} p-4`}>
              <h3 className="font-medium text-fg mb-2">{getModelLabel(m.modelId)}</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                <span className="text-fg-muted">總數</span>
                <span className="font-mono text-right text-fg">{m.total}</span>
                <span className="text-emerald-ink">通過</span>
                <span className="font-mono text-right text-emerald-ink">{m.pass}</span>
                <span className="text-red-ink">失敗</span>
                <span className="font-mono text-right text-red-ink">{m.fail}</span>
                <span className="text-fg-muted">待測</span>
                <span className="font-mono text-right text-fg-muted">{m.pending}</span>
              </div>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${donePct}%`,
                    backgroundColor: donePct === 100 ? '#16a34a' : 'var(--color-primary)',
                  }}
                />
              </div>
              <p className="text-xs text-fg-subtle mt-1 text-right font-mono">{donePct}%</p>
            </div>
          );
        })}
      </div>

      {/* Category Breakdown */}
      <div className="bg-surface rounded-lg border border-border p-5">
        <h3 className="font-medium text-fg mb-3">分類統計</h3>
        <div className="space-y-2">
          {(Object.keys(categoryBreakdown) as CategoryId[]).map(cat => {
            const d = categoryBreakdown[cat];
            const pct = d.total > 0 ? Math.round((d.pass / d.total) * 100) : 0;
            return (
              <div key={cat} className="flex items-center gap-3 text-sm">
                <span className="w-44 text-fg-muted truncate">{CATEGORY_LABELS[cat]}</span>
                <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 text-right font-mono text-fg-subtle">{d.pass}/{d.total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`bg-${color}-soft border border-${color}-line rounded-lg p-3 flex items-center gap-3`}>
      <div className={`text-${color}-ink`}>{icon}</div>
      <div>
        <p className={`text-2xl font-semibold font-mono text-${color}-ink`}>{value}</p>
        <p className="text-xs text-fg-muted">{label}</p>
      </div>
    </div>
  );
}
