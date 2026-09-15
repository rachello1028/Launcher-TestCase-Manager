import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import type { CategoryId, ScriptStatus, ScriptResult } from '../types';
import { getCategoryLabel, updateScriptResult, setScriptStepActual } from '../store';
import { createJiraIssue } from '../jira';
import { CheckCircle2, XCircle, Ban, Clock, ChevronDown, ChevronRight, MessageSquare, ExternalLink, Loader2, Filter } from 'lucide-react';

const STATUS_META: Record<ScriptStatus, { label: string; icon: typeof CheckCircle2; text: string; activeCls: string }> = {
  pass: { label: 'Pass', icon: CheckCircle2, text: 'text-emerald-ink', activeCls: 'bg-emerald-soft text-emerald-ink border-emerald-line' },
  fail: { label: 'Fail', icon: XCircle, text: 'text-red-ink', activeCls: 'bg-red-soft text-red-ink border-red-line' },
  blocked: { label: 'Blocked', icon: Ban, text: 'text-amber-ink', activeCls: 'bg-amber-soft text-amber-ink border-amber-line' },
  pending: { label: '待測', icon: Clock, text: 'text-fg-subtle', activeCls: '' },
};

const FILTERS: { id: ScriptStatus | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'fail', label: 'Fail' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'pending', label: '待測' },
  { id: 'pass', label: 'Pass' },
];

export function ScriptChecklist({ onCreateRound }: { onCreateRound: () => void }) {
  const { rounds, activeRoundId, masterCases } = useStore();
  const round = rounds.find(r => r.id === activeRoundId);
  const [statusFilter, setStatusFilter] = useState<ScriptStatus | 'all'>('all');
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [creatingJira, setCreatingJira] = useState<string | null>(null);

  if (!round) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-fg-muted">
        <p className="text-lg font-medium">尚無測試回合</p>
        <button onClick={onCreateRound} className="btn-primary mt-4 px-4 py-2 rounded-md text-sm font-medium cursor-pointer">建立測試回合</button>
      </div>
    );
  }

  const results = round.scriptResults || {};
  const statusOf = (caseId: string): ScriptStatus => results[caseId]?.status || 'pending';

  const grouped: Record<CategoryId, typeof masterCases> = {} as any;
  masterCases.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });

  const toggleCat = (cat: string) => {
    const next = new Set(collapsedCats);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setCollapsedCats(next);
  };
  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const setStatus = (caseId: string, status: ScriptStatus) => {
    const current = statusOf(caseId);
    updateScriptResult(round.id, caseId, { status: current === status ? 'pending' : status });
  };

  const saveNote = (caseId: string) => {
    updateScriptResult(round.id, caseId, { notes: noteText });
    setEditingNote(null);
  };

  const handleCreateJira = async (caseId: string, caseName: string, category: CategoryId) => {
    if (creatingJira) return;
    setCreatingJira(caseId);
    const c = masterCases.find(x => x.id === caseId);
    const res = results[caseId];
    const stepLines = (c?.steps || []).map((s, i) =>
      `${i + 1}. ${s.action}\n   預期：${s.expected}\n   實際：${res?.stepActuals?.[s.id] || '(未填)'}`
    ).join('\n');
    const summary = `[${round.version}] ${getCategoryLabel(category)} — ${caseName}`;
    const description = [
      `版本: ${round.version}`,
      `分類: ${getCategoryLabel(category)}`,
      `案例: ${caseName}`,
      c?.precondition ? `前置條件: ${c.precondition}` : '',
      '',
      '步驟：',
      stepLines,
      '',
      '備註:',
      res?.notes || '(無)',
    ].filter(Boolean).join('\n');

    const result = await createJiraIssue(summary, description);
    setCreatingJira(null);
    if (result.success) {
      updateScriptResult(round.id, caseId, { status: 'fail', jiraKey: result.key });
      window.open(result.url, '_blank');
    } else {
      alert(`建立 Jira Issue 失敗：${result.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sticky status filter */}
      <div className="sticky top-[96px] z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-canvas border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-fg-subtle" />
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer
                ${statusFilter === f.id ? 'bg-blue-soft text-blue-ink border-blue-line' : 'bg-surface text-fg-muted border-border hover:bg-surface-3'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {masterCases.length === 0 && (
        <div className="text-center py-16 text-fg-muted text-sm">此專案尚無案例，請先到「案例管理」建立腳本案例。</div>
      )}

      {(Object.keys(grouped) as CategoryId[]).map(cat => {
        const catCases = grouped[cat];
        const visible = catCases.filter(c => statusFilter === 'all' || statusOf(c.id) === statusFilter);
        if (visible.length === 0) return null;
        const collapsed = collapsedCats.has(cat);
        const done = catCases.filter(c => statusOf(c.id) !== 'pending').length;

        return (
          <div key={cat} className="bg-surface rounded-lg border border-border overflow-hidden">
            <button onClick={() => toggleCat(cat)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-3 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                {collapsed ? <ChevronRight size={16} className="text-fg-subtle" /> : <ChevronDown size={16} className="text-fg-subtle" />}
                <h3 className="font-medium text-fg">{getCategoryLabel(cat)}</h3>
              </div>
              <span className="text-xs font-mono text-fg-subtle">{done}/{catCases.length}</span>
            </button>

            {!collapsed && (
              <div className="border-t border-border divide-y divide-border">
                {visible.map(c => {
                  const res: ScriptResult | undefined = results[c.id];
                  const status = statusOf(c.id);
                  const isOpen = expanded.has(c.id);
                  const isEditingNote = editingNote === c.id;
                  return (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleExpand(c.id)} className="mt-0.5 text-fg-subtle hover:text-fg cursor-pointer" title={isOpen ? '收合步驟' : '展開步驟'}>
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-fg font-medium">{c.name}</span>
                            <span className="text-[11px] text-fg-subtle">{c.steps?.length || 0} 步驟</span>
                            {c.environments?.map(env => (
                              <span key={env} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-soft text-blue-ink">{env}</span>
                            ))}
                          </div>
                          {res?.notes && !isEditingNote && <p className="text-xs text-fg-subtle mt-1">{res.notes}</p>}
                        </div>

                        {/* 總狀態按鈕組 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {(['pass', 'fail', 'blocked'] as ScriptStatus[]).map(s => {
                            const meta = STATUS_META[s];
                            const active = status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => setStatus(c.id, s)}
                                className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer min-w-[52px]
                                  ${active ? meta.activeCls : 'bg-surface-2 text-fg-muted border-border hover:bg-surface-3'}`}
                                title={`標記為 ${meta.label}`}
                              >
                                {meta.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingNote(c.id); setNoteText(res?.notes || ''); }} className="p-1.5 rounded text-fg-subtle hover:text-fg hover:bg-surface-3 cursor-pointer" title="備註">
                            <MessageSquare size={14} />
                          </button>
                          {status === 'fail' && !res?.jiraKey && (
                            <button onClick={() => handleCreateJira(c.id, c.name, c.category)} disabled={creatingJira === c.id} className="p-1.5 rounded text-red-ink hover:bg-red-soft disabled:opacity-50 cursor-pointer" title="建立 Jira Issue">
                              {creatingJira === c.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                            </button>
                          )}
                          {res?.jiraKey && (
                            <a href={`https://cybersoft4u.atlassian.net/browse/${res.jiraKey}`} target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 rounded text-xs font-mono bg-red-soft text-red-ink hover:underline" title={`開啟 ${res.jiraKey}`}>
                              {res.jiraKey}
                            </a>
                          )}
                        </div>
                      </div>

                      {isEditingNote && (
                        <div className="mt-2 ml-7 flex gap-2">
                          <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNote(c.id)} placeholder="輸入備註..." className="flex-1 px-2.5 py-1.5 rounded-md border border-border-strong text-sm" autoFocus />
                          <button onClick={() => saveNote(c.id)} className="btn-primary px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer">儲存</button>
                          <button onClick={() => setEditingNote(null)} className="btn-secondary px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer">取消</button>
                        </div>
                      )}

                      {/* 展開：前置條件 + 步驟表 */}
                      {isOpen && (
                        <div className="mt-3 ml-7 space-y-3">
                          {c.precondition && (
                            <div className="text-xs bg-surface-2 border border-border rounded-md px-3 py-2">
                              <span className="font-medium text-fg-muted">前置條件：</span>
                              <span className="text-fg-subtle">{c.precondition}</span>
                            </div>
                          )}
                          {(c.steps || []).length === 0 ? (
                            <p className="text-xs text-fg-subtle">此案例未定義步驟。</p>
                          ) : (
                            <div className="border border-border rounded-lg overflow-hidden">
                              <div className="grid grid-cols-[28px_1fr_1fr_1fr] bg-surface-2 text-[11px] font-medium text-fg-subtle">
                                <div className="px-2 py-1.5 text-center">#</div>
                                <div className="px-2.5 py-1.5 border-l border-border">操作</div>
                                <div className="px-2.5 py-1.5 border-l border-border">預期結果</div>
                                <div className="px-2.5 py-1.5 border-l border-border">實際結果</div>
                              </div>
                              {(c.steps || []).map((step, i) => (
                                <div key={step.id} className="grid grid-cols-[28px_1fr_1fr_1fr] border-t border-border text-xs">
                                  <div className="px-2 py-2 text-center font-mono text-fg-subtle">{i + 1}</div>
                                  <div className="px-2.5 py-2 border-l border-border text-fg whitespace-pre-wrap">{step.action}</div>
                                  <div className="px-2.5 py-2 border-l border-border text-fg-muted whitespace-pre-wrap">{step.expected}</div>
                                  <div className="border-l border-border">
                                    <textarea
                                      value={res?.stepActuals?.[step.id] || ''}
                                      onChange={e => setScriptStepActual(round.id, c.id, step.id, e.target.value)}
                                      placeholder="填入實際結果…"
                                      rows={2}
                                      className="w-full h-full px-2.5 py-2 text-xs border-0 bg-transparent resize-y focus:bg-surface-2 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
