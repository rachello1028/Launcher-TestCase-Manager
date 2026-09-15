export type ModelId = string;

export interface ModelDef {
  id: ModelId;
  label: string;
}

export const DEFAULT_MODELS: ModelDef[] = [
  { id: 'A80', label: 'A80' },
  { id: 'A80_OS10', label: 'A80 OS 10.0' },
  { id: 'A920_OS5', label: 'A920 OS5.0' },
  { id: 'A920_OS7', label: 'A920 OS7.0' },
  { id: 'A920_Pro', label: 'A920 Pro' },
  { id: 'A910', label: 'A910' },
  { id: 'A910S_OS12', label: 'A910S OS12' },
  { id: 'A50', label: 'A50' },
];

export type CategoryId = string;

export interface CategoryDef {
  id: CategoryId;
  label: string;
}

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: 'params', label: '參數設定' },
  { id: 'function', label: '功能' },
  { id: 'transaction', label: '交易串接' },
  { id: 'settlement', label: '結帳更新' },
  { id: 'boot', label: '開機' },
  { id: 'external', label: '外接設備' },
  { id: 'version', label: '升降版' },
  { id: 'statusbar', label: 'Status / Navigation Bar' },
];

// 腳本模式：一個測試步驟（操作 + 預期結果）
export interface TestStep {
  id: string;
  action: string;
  expected: string;
}

export interface TestCase {
  id: string;
  category: CategoryId;
  name: string;
  parentId?: string;
  models: ModelId[];         // 矩陣模式用
  requiredModels?: number;   // 矩陣模式用
  // 腳本模式用
  precondition?: string;
  steps?: TestStep[];
  environments?: string[];
}

export type TestStatus = 'pass' | 'fail' | 'fixed' | 'skip' | 'pending';

export interface TestResult {
  caseId: string;
  modelId: ModelId;
  status: TestStatus;
  notes: string;
  jiraKey?: string;
  updatedAt?: string;
}

// 腳本模式：一條案例的執行結果（總狀態 + 每步實際結果）
export type ScriptStatus = 'pass' | 'fail' | 'blocked' | 'pending';

export interface ScriptResult {
  caseId: string;
  status: ScriptStatus;
  stepActuals: Record<string, string>; // stepId → 實際結果
  notes: string;
  jiraKey?: string;
  environment?: string;
  updatedAt?: string;
}

export interface TestRound {
  id: string;
  version: string;
  models: ModelId[];
  createdAt: string;
  results: Record<string, TestResult>;          // 矩陣模式：key = caseId__modelId
  scriptResults?: Record<string, ScriptResult>; // 腳本模式：key = caseId
}

export type TestMode = 'matrix' | 'script';

export interface Project {
  id: string;
  name: string;
  testMode: TestMode;
  masterCases: TestCase[];
  rounds: TestRound[];
  activeRoundId: string | null;
  models: ModelDef[];
  categories: CategoryDef[];
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
}
