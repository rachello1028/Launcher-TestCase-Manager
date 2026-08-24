import * as XLSX from 'xlsx';
import { getState, getResultKey, getCategoryLabel, getCasesForModel } from './store';
import type { CategoryId, TestStatus } from './types';

interface ReportCase {
  name: string;
  category: CategoryId;
  aggregateStatus: 'pass' | 'fail' | 'pending';
  verifiedModels: string[]; // 只含 pass / fixed 的機種
  allModelsPass: boolean;   // round 全機種都 pass → 顯示 All
  notes: string;
  jiraKey?: string;
}

interface ReportData {
  version: string;
  createdAt: string;
  orderedCats: CategoryId[];
  grouped: Record<CategoryId, ReportCase[]>;
  itemPass: number;
  itemFixed: number;
  itemFail: number;
  itemPending: number;
  effectiveTotal: number;
}

// 共用彙總：跨機種去重成一案例一列，逐機種計數與統計總覽同口徑（扣掉 skip）
function buildReportData(): ReportData | null {
  const state = getState();
  const round = state.rounds.find(r => r.id === state.activeRoundId);
  if (!round) return null;

  const allCaseIds = new Set<string>();
  round.models.forEach(m => {
    getCasesForModel(m).forEach(c => allCaseIds.add(c.id));
  });

  const reportCases: ReportCase[] = [];
  let itemPass = 0, itemFixed = 0, itemFail = 0, itemPending = 0;

  allCaseIds.forEach(caseId => {
    const tc = state.masterCases.find(c => c.id === caseId);
    if (!tc) return;

    const modelsInRound = tc.models.filter(m => round.models.includes(m));
    let hasFail = false;
    let hasPending = false;
    let allSkip = true;
    const passModels: string[] = []; // 只收 pass / fixed 的機種
    let failNotes = '';
    let jiraKey = '';

    modelsInRound.forEach(m => {
      const r = round.results[getResultKey(caseId, m)];
      const s: TestStatus = r?.status || 'pending';
      if (s === 'skip') return;
      allSkip = false;
      if (s === 'pass') itemPass++;
      else if (s === 'fixed') itemFixed++;
      else if (s === 'fail') itemFail++;
      else if (s === 'pending') itemPending++;
      if (s === 'pass' || s === 'fixed') {
        const label = state.models.find(md => md.id === m)?.label || m;
        passModels.push(label);
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
    // All = round 全部機種都 pass/fixed（指派全機種且全數通過）；否則只列出有 pass 的機種
    const allModelsPass = passModels.length === round.models.length;

    reportCases.push({
      name: tc.name,
      category: tc.category,
      aggregateStatus,
      verifiedModels: passModels,
      allModelsPass,
      notes: hasFail ? failNotes : '',
      jiraKey: hasFail ? jiraKey : undefined,
    });
  });

  const grouped: Record<CategoryId, ReportCase[]> = {};
  const orderedCats: CategoryId[] = [];
  reportCases.forEach(c => {
    if (!grouped[c.category]) { grouped[c.category] = []; orderedCats.push(c.category); }
    grouped[c.category].push(c);
  });

  return {
    version: round.version,
    createdAt: round.createdAt,
    orderedCats,
    grouped,
    itemPass,
    itemFixed,
    itemFail,
    itemPending,
    effectiveTotal: itemPass + itemFixed + itemFail + itemPending,
  };
}

function statusText(s: ReportCase['aggregateStatus']): string {
  return s === 'pass' ? 'Pass' : s === 'fail' ? 'Fail' : '待測';
}

function verifyModelsText(c: ReportCase): string {
  if (c.allModelsPass) return 'All';
  return c.verifiedModels.length > 0 ? c.verifiedModels.join('、') : '-';
}

// ── HTML 報告（列印 / 存 PDF）──

export function generateReport() {
  const data = buildReportData();
  if (!data) return;
  const { version, createdAt, orderedCats, grouped, itemPass, itemFixed, itemFail, itemPending, effectiveTotal } = data;
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

  let idx = 0;
  const categoryRows = orderedCats.map(cat => {
    const rows = grouped[cat].map(c => {
      idx++;
      const color = c.aggregateStatus === 'pass' ? '#047857' : c.aggregateStatus === 'fail' ? '#b91c1c' : '#92400e';
      const bg = c.aggregateStatus === 'fail' ? '#fef2f2' : 'transparent';
      const jiraLink = c.jiraKey ? `<a href="https://cybersoft4u.atlassian.net/browse/${c.jiraKey}" style="color:#1d4ed8;font-size:11px;">${c.jiraKey}</a>` : '';
      const noteHtml = c.notes ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${escapeHtml(c.notes)}</div>` : '';
      const verify = c.allModelsPass
        ? '<span style="color:#047857;font-weight:600;">All</span>'
        : c.verifiedModels.length > 0
          ? escapeHtml(c.verifiedModels.join('、'))
          : '<span style="color:#94a3b8;">-</span>';

      return `<tr style="background:${bg}">
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px;">${idx}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:13px;">${escapeHtml(c.name)}${noteHtml}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;color:#475569;">${verify}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:600;color:${color};font-size:13px;">${statusText(c.aggregateStatus)}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;">${jiraLink}</td>
      </tr>`;
    }).join('');

    return `<tr>
      <td colspan="5" style="padding:8px 10px;border:1px solid #e2e8f0;background:#f1f5f9;font-weight:600;font-size:13px;color:#334155;">${escapeHtml(getCategoryLabel(cat))}</td>
    </tr>${rows}`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<title>${escapeHtml(version)} 回歸測試報告</title>
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
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 20px 0; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; }
  .summary-card .label { font-size: 12px; color: #64748b; }
  .summary-card .value { font-size: 24px; font-weight: 700; font-family: monospace; }
</style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
    <h1 style="font-size:20px;font-weight:700;">${escapeHtml(version)} 回歸測試報告</h1>
    <button class="no-print" onclick="window.print()" style="padding:8px 20px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;font-size:13px;">列印 / 存 PDF</button>
  </div>
  <div style="font-size:13px;color:#64748b;margin-bottom:20px;">
    報告日期：${today}　｜　建立日期：${new Date(createdAt).toLocaleDateString('zh-TW')}
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">需驗證</div>
      <div class="value" style="color:#1d4ed8;">${effectiveTotal}</div>
    </div>
    <div class="summary-card">
      <div class="label">通過</div>
      <div class="value" style="color:#047857;">${itemPass}</div>
    </div>
    <div class="summary-card" style="${itemFail > 0 ? 'border-color:#fecaca;background:#fef2f2;' : ''}">
      <div class="label">失敗</div>
      <div class="value" style="color:#b91c1c;">${itemFail}</div>
    </div>
    <div class="summary-card">
      <div class="label">已修復</div>
      <div class="value" style="color:#0369a1;">${itemFixed}</div>
    </div>
    <div class="summary-card">
      <div class="label">待測</div>
      <div class="value" style="color:#92400e;">${itemPending}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;width:40px;">#</th>
        <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;font-size:12px;color:#64748b;">測試案例</th>
        <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;font-size:12px;color:#64748b;width:140px;">驗證機種</th>
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

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${version.replace(/\s+/g, '_') || 'report'}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    alert('瀏覽器阻擋了新分頁，已改為下載報告 HTML 檔，開啟即可列印或存 PDF。');
  }
}

// ── Excel 報告（.xlsx，分類分組）──

export function generateExcel() {
  const data = buildReportData();
  if (!data) return;
  const { version, createdAt, orderedCats, grouped, itemPass, itemFixed, itemFail, itemPending, effectiveTotal } = data;
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const aoa: (string | number)[][] = [];
  const merges: XLSX.Range[] = [];
  const COLS = 5;

  // 標題列
  aoa.push([`${version} 回歸測試報告`]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } });
  aoa.push([`報告日期：${today}`, '', `建立日期：${new Date(createdAt).toLocaleDateString('zh-TW')}`]);
  aoa.push([]);

  // 摘要（標籤列 + 數值列）
  aoa.push(['需驗證', '通過', '失敗', '已修復', '待測']);
  aoa.push([effectiveTotal, itemPass, itemFail, itemFixed, itemPending]);
  aoa.push([]);

  // 表頭
  aoa.push(['#', '測試案例', '驗證機種', '結果', 'Issue']);

  // 分類分組
  let idx = 0;
  orderedCats.forEach(cat => {
    const catRow = aoa.length;
    aoa.push([getCategoryLabel(cat)]);
    merges.push({ s: { r: catRow, c: 0 }, e: { r: catRow, c: COLS - 1 } });
    grouped[cat].forEach(c => {
      idx++;
      const name = c.notes ? `${c.name}（${c.notes}）` : c.name;
      aoa.push([idx, name, verifyModelsText(c), statusText(c.aggregateStatus), c.jiraKey || '']);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 5 }, { wch: 46 }, { wch: 20 }, { wch: 8 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '回歸測試');
  const fname = `${version.replace(/\s+/g, '_') || 'report'}_回歸測試報告_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fname);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
