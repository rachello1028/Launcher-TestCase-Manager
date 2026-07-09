import { useSyncExternalStore } from 'react';
import { subscribe, getState } from '../store';

export function useStore() {
  return useSyncExternalStore(subscribe, getState);
}
