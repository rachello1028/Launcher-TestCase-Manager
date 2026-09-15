import { useSyncExternalStore } from 'react';
import { subscribe, getState, getActiveProject } from '../store';
import type { AppState, Project } from '../types';

// 回傳「當前專案」，欄位（masterCases/rounds/activeRoundId/models/categories）與舊版相容
export function useStore(): Project {
  return useSyncExternalStore(subscribe, getActiveProject) as Project;
}

// 回傳完整 App 狀態（專案清單 + 當前專案 id），供專案切換用
export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState);
}
