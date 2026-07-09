import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { CATEGORY_LABELS, type ModelId, type CategoryId, type TestStatus } from '../types';
import { getCasesForModel, getResultKey, updateResult, getModelLabel } from '../store';
import { CheckCircle2, XCircle, SkipForward, Clock, ExternalLink, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_CONFIG: Record<TestStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  pass: { icon: CheckCircle2, label: 'Pass', className: 'text-emerald-ink' },
  fail: { icon: XCircle, label: 'Fail', className: 'text-red-ink' },
  skip: { icon: SkipForward, label: 'Skip', className: 'text-amber-ink' },
  pending: { icon: Clock, label: '待測', className: 'text-fg-subtle' },
};

export function Checklist() {
  const { rounds, activeRoundId } = useStore();
  const round = rounds.find(r => r.id === activeRoundId);
  const [activeModel, setActiveModel] = useState<ModelId | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  if (!round) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-fg-muted">
        <p className="text-lg font-medium">請先選擇或建立測試回合</p>
      </div>
    );
  }

  const currentModel = activeModel && round.models.includes(activeModel) ? activeModel : round.models[0];
  const cases = getCasesForModel(currentModel);
  const grouped: Record<CategoryId, typeof cases> = {} as any;
  cases.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });

  const toggleCat = (cat: string) => {
    const next = new Set(collapsedCats);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setCollapsedCats(next);
  };

  const cycleStatus = (caseId: string) => {
    const key = getResultKey(caseId, currentModel);
    const current = round.results[key]?.status || 'pending';
    const order: TestStatus[] = ['pending', 'pass', 'fail', 'skip'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateResult(round.id, caseId, currentModel, next, round.results[key]?.notes || '');
  };

  const openJira = (caseId: string, caseName: string, category: CategoryId) => {
    const summary = `[${round.version}][${getModelLabel(currentModel)}] ${CATEGORY_LABELS[category]} — ${caseName}`;
    const description = [
      `*版本*: ${round.version}`,
      `*機型*: ${getModelLabel(currentModel)}`,
      `*分類*: ${CATEGORY_LABELS[category]}`,
      `*案例*: ${caseName}`,
      '',
      '*問題描述*:',
      round.results[getResultKey(caseId, currentModel)]?.notes || '(請補充)',
    ].join('\n');
    window.open(`https://cybersoft4u.atlassian.net/jira/software/c/projects/ED/issues/create?summary=${encodeURIComponent(summary)}&description=${encodeURIComponent(description)}`, '_blank');
  };

  const saveNote = (caseId: string) => {
    const key = getResultKey(caseId, currentModel);
    const current = round.results[key];
    updateResult(round.id, caseId, currentModel, current?.status || 'pending', noteText, current?.jiraKey);
    setEditingNote(null);
  };

  const modelCounts = round.models.map(m => {
    const mCases = getCasesForModel(m);
    let done = 0;
    mCases.forEach(c => {
      const r = round.results[getResultKey(c.id, m)];
      if (r && r.status !== 'pending') done++;
    });
    return { modelId: m, total: mCases.length, done };
  });

  return (
    <div className="space-y-4">
      {/* Model tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {modelCounts.map(({ modelId, total, done }) => {
          const active = modelId === currentModel;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <button
              key={modelId}
              onClick={() => setActiveModel(modelId)}
              className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium border transition-colors
                ${active
                  ? 'bg-blue-soft text-blue-ink border-blue-line'
                  : 'bg-surface text-fg-muted border-border hover:bg-surface-3 hover:text-fg'
                }`}
            >
              <span>{getModelLabel(modelId)}</span>
              <span className="ml-2 text-xs font-mono opacity-70">{pct}%</span>
            </button>
          );
        })}
      </div>

      {/* Cases by category */}
      {(Object.keys(grouped) as CategoryId[]).map(cat => {
        const catCases = grouped[cat];
        const collapsed = collapsedCats.has(cat);
        const catDone = catCases.filter(c => {
          const r = round.results[getResultKey(c.id, currentModel)];
          return r && r.status !== 'pending';
        }).length;

        return (
          <div key={cat} className="bg-surface rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-3 transition-colors"
            >
              <div className="flex items-center gap-2">
                {collapsed ? <ChevronRight size={16} className="text-fg-subtle" /> : <ChevronDown size={16} className="text-fg-subtle" />}
                <h3 className="font-medium text-fg">{CATEGORY_LABELS[cat]}</h3>
              </div>
              <span className="text-xs font-mono text-fg-subtle">{catDone}/{catCases.length}</span>
            </button>

            {!collapsed && (
              <div className="border-t border-border divide-y divide-border">
                {catCases.map(c => {
                  const key = getResultKey(c.id, currentModel);
                  const result = round.results[key];
                  const status: TestStatus = result?.status || 'pending';
                  const config = STATUS_CONFIG[status];
                  const Icon = config.icon;
                  const isEditing = editingNote === key;

                  return (
                    <div key={c.id} className="px-4 py-2.5 flex items-start gap-3 group">
                      <button
                        onClick={() => cycleStatus(c.id)}
                        className={`mt-0.5 flex-shrink-0 transition-colors ${config.className} hover:opacity-70`}
                        title={`目前：${config.label}，點擊切換`}
                      >
                        <Icon size={20} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${status === 'pass' ? 'text-fg-muted line-through' : 'text-fg'}`}>
                          {c.name}
                        </span>
                        {result?.notes && !isEditing && (
                          <p className="text-xs text-fg-subtle mt-0.5">{result.notes}</p>
                        )}
                        {isEditing && (
                          <div className="mt-1.5 flex gap-2">
                            <input
                              type="text"
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveNote(c.id)}
                              placeholder="輸入備註..."
                              className="flex-1 px-2.5 py-1.5 rounded-md border border-border-strong text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => saveNote(c.id)}
                              className="btn-primary px-3 py-1.5 rounded-md text-xs font-medium"
                            >
                              儲存
                            </button>
                            <button
                              onClick={() => setEditingNote(null)}
                              className="btn-secondary px-3 py-1.5 rounded-md text-xs font-medium"
                            >
                              取消
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingNote(key);
                            setNoteText(result?.notes || '');
                          }}
                          className="p-1.5 rounded text-fg-subtle hover:text-fg hover:bg-surface-3"
                          title="備註"
                        >
                          <MessageSquare size={14} />
                        </button>
                        {status === 'fail' && (
                          <button
                            onClick={() => openJira(c.id, c.name, c.category)}
                            className="p-1.5 rounded text-red-ink hover:bg-red-soft"
                            title="建立 Jira Issue"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
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
