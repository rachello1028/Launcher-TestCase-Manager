import type { AppState, TestCase, TestRound, TestResult, ModelId, ModelDef, TestStatus } from './types';
import { DEFAULT_CASES } from './masterData';
import { DEFAULT_MODELS } from './types';

const STORAGE_KEY = 'launcher-test-manager';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.masterCases && parsed.rounds) {
        if (!parsed.models) parsed.models = DEFAULT_MODELS;
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return { masterCases: DEFAULT_CASES, rounds: [], activeRoundId: null, models: DEFAULT_MODELS };
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

export function getModelLabel(modelId: ModelId): string {
  const m = _state.models.find(m => m.id === modelId);
  return m ? m.label : modelId;
}

export function getAllModelIds(): ModelId[] {
  return _state.models.map(m => m.id);
}

// ── Model management ──

export function addModel(id: string, label: string) {
  const normalized = id.replace(/\s+/g, '_');
  if (_state.models.some(m => m.id === normalized)) return false;
  _state = { ..._state, models: [..._state.models, { id: normalized, label }] };
  notify();
  return true;
}

export function updateModel(oldId: string, label: string) {
  _state = {
    ..._state,
    models: _state.models.map(m => m.id === oldId ? { ...m, label } : m),
  };
  notify();
}

export function deleteModel(modelId: string) {
  _state = {
    ..._state,
    models: _state.models.filter(m => m.id !== modelId),
    masterCases: _state.masterCases.map(c => ({
      ...c,
      models: c.models.filter(m => m !== modelId),
    })),
  };
  notify();
}

// ── Round management ──

export function createRound(version: string, models: ModelId[]): TestRound {
  const round: TestRound = {
    id: `round_${Date.now()}`,
    version,
    models,
    createdAt: new Date().toISOString(),
    results: {},
  };
  _state = { ..._state, rounds: [round, ..._state.rounds], activeRoundId: round.id };
  notify();
  return round;
}

export function setActiveRound(roundId: string | null) {
  _state = { ..._state, activeRoundId: roundId };
  notify();
}

export function deleteRound(roundId: string) {
  _state = {
    ..._state,
    rounds: _state.rounds.filter(r => r.id !== roundId),
    activeRoundId: _state.activeRoundId === roundId ? null : _state.activeRoundId,
  };
  notify();
}

// ── Test results ──

export function updateResult(roundId: string, caseId: string, modelId: ModelId, status: TestStatus, notes: string, jiraKey?: string) {
  const key = `${caseId}__${modelId}`;
  const result: TestResult = { caseId, modelId, status, notes, jiraKey, updatedAt: new Date().toISOString() };
  _state = {
    ..._state,
    rounds: _state.rounds.map(r =>
      r.id === roundId ? { ...r, results: { ...r.results, [key]: result } } : r
    ),
  };
  notify();
}

export function getResultKey(caseId: string, modelId: ModelId) {
  return `${caseId}__${modelId}`;
}

// ── Case management ──

export function addCase(c: TestCase) {
  _state = { ..._state, masterCases: [..._state.masterCases, c] };
  notify();
}

export function updateCase(caseId: string, updates: Partial<TestCase>) {
  _state = {
    ..._state,
    masterCases: _state.masterCases.map(c => c.id === caseId ? { ...c, ...updates } : c),
  };
  notify();
}

export function deleteCase(caseId: string) {
  _state = { ..._state, masterCases: _state.masterCases.filter(c => c.id !== caseId) };
  notify();
}

export function getCasesForModel(modelId: ModelId): TestCase[] {
  return _state.masterCases.filter(c => c.models.includes(modelId));
}

// ── Import / Export ──

export function exportRound(roundId: string) {
  const round = _state.rounds.find(r => r.id === roundId);
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
  try {
    const data = JSON.parse(json) as AppState;
    if (data.masterCases && data.rounds) {
      if (!data.models) data.models = DEFAULT_MODELS;
      _state = data;
      notify();
      return true;
    }
  } catch { /* ignore */ }
  return false;
}
