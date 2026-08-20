import { getState, getResultKey, getCategoryLabel, getCasesForModel } from './store';
import type { CategoryId, TestStatus } from './types';

interface ReportCase {
  name: string;
  category: CategoryId;
  aggregateStatus: 'pass' | 'fail' | 'pending';
  testedModels: string[];
  notes: string;
  jiraKey?: string;
}

export function generateReport() {
  const state = getState();
  const round = state.rounds.find(r => r.id === state.activeRoundId);
  if (!round) return;

  const allCaseIds = new Set<string>();
  round.models.forEach(m => {
    getCasesForModel(m).forEach(c => allCaseIds.add(c.id));
  });

  const reportCases: ReportCase[] = [];

  allCaseIds.forEach(caseId => {
    const tc = state.masterCases.find(c => c.id === caseId);
    if (!tc) return;

    const modelsInRound = tc.models.filter(m => round.models.includes(m));
    let hasFail = false;
    let hasPending = false;
    let allSkip = true;
    const testedModels: string[] = [];
    let failNotes = '';
    let jiraKey = '';

    modelsInRound.forEach(m => {
      const r = round.results[getResultKey(caseId, m)];
      const s: TestStatus = r?.status || 'pending';
      if (s === 'skip') return;
      allSkip = false;
      if (s === 'pass' || s === 'fixed') {
        const label = state.models.find(md => md.id === m)?.label || m;
        testedModels.push(label);
      }
      if (s === 'fail') {
        hasFail = true;
        if (r?.notes) failNotes = r.notes;
        if (r?.jiraKey) jiraKey = r.jiraKey;
      }
      if (s === 'pending') hasPending = true;
    });

    if (allSkip) return;

    const aggregateStatus = hasFail ? 'fail' : hasPending ? 'pending' : 'pass';

    reportCases.push({
      name: tc.name,
      category: tc.category,
      aggregateStatus,
      testedModels,
      notes: hasFail ? failNotes : '',
      jiraKey: hasFail ? jiraKey : undefined,
    });
  });

  const grouped: Record<CategoryId, ReportCase[]> = {};
  reportCases.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });

  const totalCases = reportCases.length;
  const passCount = reportCases.filter(c => c.aggregateStatus === 'pass').length;
  const failCount = reportCases.filter(c => c.aggregateStatus === 'fail').length;
  const pendingCount = reportCases.filter(c => c.aggregateStatus === 'pending').length;
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

  let idx = 0;
  const categoryRows = Object.keys(grouped).map(cat => {
    const cases = grouped[cat as CategoryId];
    const rows = cases.map(c => {
      idx++;
      const statusText = c.aggregateStatus === 'pass' ? 'Pass' : c.aggregateStatus === 'fail' ? 'Fail' : '待測';
      const statusColor = c.aggregateStatus === 'pass' ? '#047857' : c.aggregateStatus === 'fail' ? '#b91c1c' : '#92400e';
      const statusBg = c.aggregateStatus === 'fail' ? '#fef2f2' : 'transparent';
      const jiraLink = c.jiraKey ? `<a href="https://cybersoft4u.atlassian.net/browse/${c.jiraKey}" style="color:#1d4ed8;font-size:11px;">${c.jiraKey}</a>` : '';
      const noteHtml = c.notes ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${escapeHtml(c.notes)}</div>` : '';

      return `<tr style="background:${statusBg}">
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px;">${idx}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:13px;">${escapeHtml(c.name)}${noteHtml}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:600;color:${statusColor};font-size:13px;">${statusText}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;">${jiraLink}</td>
      </tr>`;
    }).join('');

    return `<tr>
      <td colspan="4" style="padding:8px 10px;border:1px solid #e2e8f0;background:#f1f5f9;font-weight:600;font-size:13px;color:#334155;">${escapeHtml(getCategoryLabel(cat))}</td>
    </tr>${rows}`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<title>${escapeHtml(round.version)} 回歸測試報告</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; background: #fff; color: #1e293b; padding: 40px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none !important; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
  table { border-collapse: collapse; width: 100%; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; }
  .summary-card .label { font-size: 12px; color: #64748b; }
  .summary-card .value { font-size: 24px; font-weight: 700; font-family: monospace; }
</style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
    <h1 style="font-size:20px;font-weight:700;">${escapeHtml(round.version)} 回歸測試報告</h1>
    <button class="no-print" onclick="window.print()" style="padding:8px 20px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;font-size:13px;">列印 / 存 PDF</button>
  </div>
  <div style="font-size:13px;color:#64748b;margin-bottom:20px;">
    報告日期：${today}　｜　建立日期：${new Date(round.createdAt).toLocaleDateString('zh-TW')}
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">測試案例</div>
      <div class="value" style="color:#1d4ed8;">${totalCases}</div>
    </div>
    <div class="summary-card">
      <div class="label">通過</div>
      <div class="value" style="color:#047857;">${passCount}</div>
    </div>
    <div class="summary-card" style="${failCount > 0 ? 'border-color:#fecaca;background:#fef2f2;' : ''}">
      <div class="label">失敗</div>
      <div class="value" style="color:#b91c1c;">${failCount}</div>
    </div>
    <div class="summary-card">
      <div class="label">待測</div>
      <div class="value" style="color:#92400e;">${pendingCount}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;width:40px;">#</th>
        <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;font-size:12px;color:#64748b;">測試案例</th>
        <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;width:70px;">結果</th>
        <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;font-size:12px;color:#64748b;width:100px;">Issue</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>

  <div style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:right;">
    Generated by Launcher Test Manager
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
