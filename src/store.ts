import type { AppState, Project, TestMode, TestCase, TestRound, TestResult, ScriptResult, ModelId, TestStatus, CategoryId } from './types';
import { DEFAULT_CASES } from './masterData';
import { DEFAULT_MODELS, DEFAULT_CATEGORIES } from './types';

const STORAGE_KEY = 'launcher-test-manager';

// 把任意已存的資料轉成新的多專案格式（向後相容舊的單一 Launcher 格式）
function migrate(raw: string): AppState | null {
  try {
    const parsed = JSON.parse(raw) as any;

    // 已是新格式（多專案）
    if (parsed && Array.isArray(parsed.projects)) {
      parsed.projects.forEach((p: Project) => {
        if (!p.testMode) p.testMode = 'matrix';
        if (!p.masterCases) p.masterCases = [];
        if (!p.rounds) p.rounds = [];
        if (p.activeRoundId === undefined) p.activeRoundId = null;
        if (!p.models) p.models = [];
        if (!p.categories) p.categories = [];
      });
      if (!parsed.activeProjectId && parsed.projects[0]) parsed.activeProjectId = parsed.projects[0].id;
      return parsed as AppState;
    }

    // 舊格式（頂層就是單一 Launcher 的資料）→ 包成第一個專案
    if (parsed && parsed.masterCases && parsed.rounds) {
      const launcher: Project = {
        id: 'launcher',
        name: 'Launcher',
        testMode: 'matrix',
        masterCases: parsed.masterCases,
        rounds: parsed.rounds,
        activeRoundId: parsed.activeRoundId ?? null,
        models: parsed.models || DEFAULT_MODELS,
        categories: parsed.categories || DEFAULT_CATEGORIES,
      };
      return { projects: [launcher], activeProjectId: 'launcher' };
    }
  } catch { /* ignore */ }
  return null;
}

function defaultState(): AppState {
  const launcher: Project = {
    id: 'launcher',
    name: 'Launcher',
    testMode: 'matrix',
    masterCases: DEFAULT_CASES,
    rounds: [],
    activeRoundId: null,
    models: DEFAULT_MODELS,
    categories: DEFAULT_CATEGORIES,
  };
  return { projects: [launcher], activeProjectId: 'launcher' };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const migrated = migrate(raw);
      if (migrated) return migrated;
    }
  } catch { /* ignore */ }
  return defaultState();
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let _state = loadState();
let _listeners: Array<() => void> = [];

function notify() {
  saveState(_state);
  _listeners.forEach(fn => fn());
}

export function subscribe(fn: () => void) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

export function getState(): AppState {
  return _state;
}

// 當前專案（find 在 _state 不變時回傳穩定引用，可安全用於 useSyncExternalStore）
export function getActiveProject(): Project | undefined {
  return _state.projects.find(p => p.id === _state.activeProjectId) || _state.projects[0];
}

// 對當前專案做不可變更新
function updateActiveProject(fn: (p: Project) => Project) {
  const active = getActiveProject();
  if (!active) return;
  _state = {
    ..._state,
    projects: _state.projects.map(p => p.id === active.id ? fn(p) : p),
  };
  notify();
}

// ── Project management ──

export function createProject(name: string, testMode: TestMode): Project {
  const proj: Project = {
    id: `proj_${Date.now()}`,
    name: name.trim() || '未命名專案',
    testMode,
    masterCases: [],
    rounds: [],
    activeRoundId: null,
    models: [],
    categories: testMode === 'matrix' ? DEFAULT_CATEGORIES : [{ id: 'general', label: '測試項目' }],
  };
  _state = { ..._state, projects: [..._state.projects, proj], activeProjectId: proj.id };
  notify();
  return proj;
}

export function setActiveProject(projectId: string) {
  _state = { ..._state, activeProjectId: projectId };
  notify();
}

export function updateProject(projectId: string, updates: Partial<Pick<Project, 'name' | 'testMode'>>) {
  _state = {
    ..._state,
    projects: _state.projects.map(p => p.id === projectId ? { ...p, ...updates } : p),
  };
  notify();
}

export function deleteProject(projectId: string) {
  const remaining = _state.projects.filter(p => p.id !== projectId);
  _state = {
    ..._state,
    projects: remaining,
    activeProjectId: _state.activeProjectId === projectId ? (remaining[0]?.id ?? null) : _state.activeProjectId,
  };
  notify();
}

// ── Model management（作用於當前專案）──

export function getModelLabel(modelId: ModelId): string {
  const m = getActiveProject()?.models.find(m => m.id === modelId);
  return m ? m.label : modelId;
}

export function getAllModelIds(): ModelId[] {
  return getActiveProject()?.models.map(m => m.id) || [];
}

export function addModel(id: string, label: string) {
  const p = getActiveProject();
  if (!p) return false;
  const normalized = id.replace(/\s+/g, '_');
  if (p.models.some(m => m.id === normalized)) return false;
  updateActiveProject(pr => ({ ...pr, models: [...pr.models, { id: normalized, label }] }));
  return true;
}

export function updateModel(oldId: string, label: string) {
  updateActiveProject(pr => ({
    ...pr,
    models: pr.models.map(m => m.id === oldId ? { ...m, label } : m),
  }));
}

export function deleteModel(modelId: string) {
  updateActiveProject(pr => ({
    ...pr,
    models: pr.models.filter(m => m.id !== modelId),
    masterCases: pr.masterCases.map(c => ({ ...c, models: c.models.filter(m => m !== modelId) })),
  }));
}

// ── Category management（作用於當前專案）──

export function getCategoryLabel(catId: CategoryId): string {
  const c = getActiveProject()?.categories.find(c => c.id === catId);
  return c ? c.label : catId;
}

export function getAllCategoryIds(): CategoryId[] {
  return getActiveProject()?.categories.map(c => c.id) || [];
}

export function addCategory(id: string, label: string) {
  const p = getActiveProject();
  if (!p) return false;
  const normalized = id.replace(/\s+/g, '_');
  if (p.categories.some(c => c.id === normalized)) return false;
  updateActiveProject(pr => ({ ...pr, categories: [...pr.categories, { id: normalized, label }] }));
  return true;
}

export function updateCategory(catId: string, label: string) {
  updateActiveProject(pr => ({
    ...pr,
    categories: pr.categories.map(c => c.id === catId ? { ...c, label } : c),
  }));
}

export function deleteCategory(catId: string) {
  updateActiveProject(pr => ({
    ...pr,
    categories: pr.categories.filter(c => c.id !== catId),
    masterCases: pr.masterCases.filter(c => c.category !== catId),
  }));
}

// ── Round management（作用於當前專案）──

export function createRound(version: string, models: ModelId[]): TestRound {
  const round: TestRound = {
    id: `round_${Date.now()}`,
    version,
    models,
    createdAt: new Date().toISOString(),
    results: {},
  };
  updateActiveProject(pr => ({ ...pr, rounds: [round, ...pr.rounds], activeRoundId: round.id }));
  return round;
}

export function setActiveRound(roundId: string | null) {
  updateActiveProject(pr => ({ ...pr, activeRoundId: roundId }));
}

export function deleteRound(roundId: string) {
  updateActiveProject(pr => ({
    ...pr,
    rounds: pr.rounds.filter(r => r.id !== roundId),
    activeRoundId: pr.activeRoundId === roundId ? null : pr.activeRoundId,
  }));
}

// ── Test results（作用於當前專案）──

export function updateResult(roundId: string, caseId: string, modelId: ModelId, status: TestStatus, notes: string, jiraKey?: string) {
  const p = getActiveProject();
  if (!p) return;
  const round = p.rounds.find(r => r.id === roundId);
  if (!round) return;

  const key = `${caseId}__${modelId}`;
  const result: TestResult = { caseId, modelId, status, notes, jiraKey, updatedAt: new Date().toISOString() };
  const updatedResults = { ...round.results, [key]: result };

  if (status === 'pass' || status === 'fixed') {
    const tc = p.masterCases.find(c => c.id === caseId);
    if (tc?.requiredModels && tc.requiredModels > 0) {
      const modelsInRound = tc.models.filter(m => round.models.includes(m));
      const doneCount = modelsInRound.filter(m => {
        const s = (m === modelId) ? status : updatedResults[`${caseId}__${m}`]?.status;
        return s === 'pass' || s === 'fixed';
      }).length;

      if (doneCount >= tc.requiredModels) {
        const now = new Date().toISOString();
        modelsInRound.forEach(m => {
          const k = `${caseId}__${m}`;
          const existing = updatedResults[k];
          if (!existing || existing.status === 'pending') {
            updatedResults[k] = { caseId, modelId: m, status: 'skip', notes: '已達驗證門檻，自動略過', updatedAt: now };
          }
        });
      }
    }
  }

  updateActiveProject(pr => ({
    ...pr,
    rounds: pr.rounds.map(r => r.id === roundId ? { ...r, results: updatedResults } : r),
  }));
}

export function getResultKey(caseId: string, modelId: ModelId) {
  return `${caseId}__${modelId}`;
}

export function skipOtherModels(roundId: string, caseId: string, currentModelId: ModelId) {
  const p = getActiveProject();
  if (!p) return 0;
  const round = p.rounds.find(r => r.id === roundId);
  const tc = p.masterCases.find(c => c.id === caseId);
  if (!round || !tc) return 0;

  const now = new Date().toISOString();
  const updatedResults = { ...round.results };
  let skipped = 0;

  tc.models.filter(m => round.models.includes(m) && m !== currentModelId).forEach(m => {
    const k = `${caseId}__${m}`;
    const existing = updatedResults[k];
    if (!existing || existing.status === 'pending') {
      updatedResults[k] = { caseId, modelId: m, status: 'skip', notes: '手動略過（其他機種不需驗證）', updatedAt: now };
      skipped++;
    }
  });

  if (skipped > 0) {
    updateActiveProject(pr => ({
      ...pr,
      rounds: pr.rounds.map(r => r.id === roundId ? { ...r, results: updatedResults } : r),
    }));
  }
  return skipped;
}

// ── Script results（腳本模式，作用於當前專案）──

export function updateScriptResult(roundId: string, caseId: string, patch: Partial<ScriptResult>) {
  updateActiveProject(pr => ({
    ...pr,
    rounds: pr.rounds.map(r => {
      if (r.id !== roundId) return r;
      const existing: ScriptResult = r.scriptResults?.[caseId] || { caseId, status: 'pending', stepActuals: {}, notes: '' };
      return {
        ...r,
        scriptResults: {
          ...r.scriptResults,
          [caseId]: { ...existing, ...patch, caseId, updatedAt: new Date().toISOString() },
        },
      };
    }),
  }));
}

export function setScriptStepActual(roundId: string, caseId: string, stepId: string, actual: string) {
  updateActiveProject(pr => ({
    ...pr,
    rounds: pr.rounds.map(r => {
      if (r.id !== roundId) return r;
      const existing: ScriptResult = r.scriptResults?.[caseId] || { caseId, status: 'pending', stepActuals: {}, notes: '' };
      return {
        ...r,
        scriptResults: {
          ...r.scriptResults,
          [caseId]: {
            ...existing,
            caseId,
            stepActuals: { ...existing.stepActuals, [stepId]: actual },
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }),
  }));
}

// ── Case management（作用於當前專案）──

export function addCase(c: TestCase) {
  updateActiveProject(pr => ({ ...pr, masterCases: [...pr.masterCases, c] }));
}

export function updateCase(caseId: string, updates: Partial<TestCase>) {
  updateActiveProject(pr => ({
    ...pr,
    masterCases: pr.masterCases.map(c => c.id === caseId ? { ...c, ...updates } : c),
  }));
}

export function deleteCase(caseId: string) {
  updateActiveProject(pr => ({ ...pr, masterCases: pr.masterCases.filter(c => c.id !== caseId) }));
}

export function getCasesForModel(modelId: ModelId): TestCase[] {
  return getActiveProject()?.masterCases.filter(c => c.models.includes(modelId)) || [];
}

// ── Import / Export ──

export function exportRound(roundId: string) {
  const round = getActiveProject()?.rounds.find(r => r.id === roundId);
  if (!round) return;
  const blob = new Blob([JSON.stringify(round, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${round.version.replace(/\s+/g, '_')}_${round.createdAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAllData() {
  const blob = new Blob([JSON.stringify(_state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `launcher_test_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(json: string) {
  const migrated = migrate(json);
  if (migrated) {
    _state = migrated;
    notify();
    return true;
  }
  return false;
}
