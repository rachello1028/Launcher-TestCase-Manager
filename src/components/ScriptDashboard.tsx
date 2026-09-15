import { useStore } from '../hooks/useStore';
import type { CategoryId, ScriptStatus } from '../types';
import { getCategoryLabel } from '../store';
import { ListChecks, CheckCircle2, XCircle, Ban, Clock } from 'lucide-react';

export function ScriptDashboard() {
  const { rounds, activeRoundId, masterCases } = useStore();
  const round = rounds.find(r => r.id === activeRoundId);

  if (!round) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-fg-muted">
        <ListChecks size={48} className="mb-4 text-fg-subtle" />
        <p className="text-lg font-medium">尚未選擇測試回合</p>
        <p className="text-sm mt-1">請先建立或選擇一個測試回合</p>
      </div>
    );
  }

  const results = round.scriptResults || {};
  const statusOf = (id: string): ScriptStatus => results[id]?.status || 'pending';

  const total = masterCases.length;
  let pass = 0, fail = 0, blocked = 0;
  masterCases.forEach(c => {
    const s = statusOf(c.id);
    if (s === 'pass') pass++;
    else if (s === 'fail') fail++;
    else if (s === 'blocked') blocked++;
  });
  const pending = total - pass - fail - blocked;
  const done = pass + fail + blocked;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const catBreakdown: Record<CategoryId, { total: number; pass: number; fail: number; blocked: number }> = {} as any;
  masterCases.forEach(c => {
    if (!catBreakdown[c.category]) catBreakdown[c.category] = { total: 0, pass: 0, fail: 0, blocked: 0 };
    catBreakdown[c.category].total++;
    const s = statusOf(c.id);
    if (s === 'pass') catBreakdown[c.category].pass++;
    else if (s === 'fail') catBreakdown[c.category].fail++;
    else if (s === 'blocked') catBreakdown[c.category].blocked++;
  });

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-fg">{round.version}</h2>
          <span className="text-sm text-fg-muted">建立於 {new Date(round.createdAt).toLocaleDateString('zh-TW')}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
          <StatCard icon={<ListChecks size={18} />} label="總案例" value={total} color="blue" />
          <StatCard icon={<CheckCircle2 size={18} />} label="Pass" value={pass} color="emerald" />
          <StatCard icon={<XCircle size={18} />} label="Fail" value={fail} color="red" />
          <StatCard icon={<Ban size={18} />} label="Blocked" value={blocked} color="amber" />
          <StatCard icon={<Clock size={18} />} label="待測" value={pending} color="blue" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">整體完成度</span>
            <span className="font-mono font-medium text-fg">{pct}%</span>
          </div>
          <div className="h-2.5 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : 'var(--color-primary)' }} />
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border p-5">
        <h3 className="font-medium text-fg mb-3">分類統計</h3>
        {total === 0 ? (
          <p className="text-sm text-fg-subtle">此專案尚無案例。</p>
        ) : (
          <div className="space-y-2">
            {(Object.keys(catBreakdown) as CategoryId[]).map(cat => {
              const d = catBreakdown[cat];
              const cpct = d.total > 0 ? Math.round((d.pass / d.total) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3 text-sm">
                  <span className="w-44 text-fg-muted truncate">{getCategoryLabel(cat)}</span>
                  <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${cpct}%` }} />
                  </div>
                  <span className="w-16 text-right font-mono text-fg-subtle">{d.pass}/{d.total}</span>
                </div>
              );
            })}
          </div>
        )}
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
