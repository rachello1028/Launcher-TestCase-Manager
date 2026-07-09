import type { TestCase, ModelId } from './types';

const ALL: ModelId[] = ['A80', 'A80_OS10', 'A920_OS5', 'A920_OS7', 'A920_Pro', 'A910', 'A910S_OS12', 'A50'];
const A80s: ModelId[] = ['A80', 'A80_OS10'];
const A920s: ModelId[] = ['A920_OS5', 'A920_OS7', 'A920_Pro'];
const A910s: ModelId[] = ['A910', 'A910S_OS12'];
const hasL920: ModelId[] = ['A920_OS5', 'A920_OS7', 'A920_Pro'];
const hasB910: ModelId[] = ['A910', 'A910S_OS12'];

let _id = 0;
function id() { return `tc_${++_id}`; }

export const DEFAULT_CASES: TestCase[] = [
  // ═══ 參數設定 ═══
  { id: id(), category: 'params', name: '外接連線模式', models: ALL },
  { id: id(), category: 'params', name: '外接連線模式 — A80 ECR 144', models: ['A80_OS10'] },
  { id: id(), category: 'params', name: '外接連線模式 — USB 400/144', models: ['A80_OS10'] },
  { id: id(), category: 'params', name: '外接連線模式 — WiFi ECR', models: ['A80_OS10'] },
  { id: id(), category: 'params', name: 'wifi 免密碼', models: ALL },
  { id: id(), category: 'params', name: '通訊密碼 — 免密碼', models: ['A80_OS10', 'A50'] },
  { id: id(), category: 'params', name: '通訊密碼 — 設定密碼', models: ['A80_OS10', 'A50'] },
  { id: id(), category: 'params', name: '網路設定密碼', models: [...A80s, ...A920s, ...A910s] },
  { id: id(), category: 'params', name: '開機自定密碼', models: ['A920_OS5'] },
  { id: id(), category: 'params', name: '自動重啟', models: ['A920_OS7', 'A920_Pro'] },
  { id: id(), category: 'params', name: '定時重啟', models: ['A910', 'A910S_OS12'] },
  { id: id(), category: 'params', name: '設定 OTP', models: ['A50'] },

  // ═══ 功能 ═══
  { id: id(), category: 'function', name: '環境設定 — 網路設定檢查', models: ALL },
  { id: id(), category: 'function', name: '各 App 設定 — EDC 參數', models: ALL },
  { id: id(), category: 'function', name: '各 App 設定 — SCP 參數', models: ALL.filter(m => m !== 'A50') },
  { id: id(), category: 'function', name: '上傳 Log', models: ['A80_OS10'] },

  // ═══ 交易串接 ═══
  { id: id(), category: 'transaction', name: 'ECR Wifi', models: ['A80', 'A910', 'A910S_OS12'] },
  { id: id(), category: 'transaction', name: 'ECR 144', models: ['A80'] },
  { id: id(), category: 'transaction', name: 'ECR 144 (GP 變動)', models: ['A80_OS10'] },
  { id: id(), category: 'transaction', name: 'ECR 400', models: [...A80s] },
  { id: id(), category: 'transaction', name: 'USB 144', models: [...A80s, ...A920s] },
  { id: id(), category: 'transaction', name: 'USB 144 (KGI)', models: ['A80_OS10'] },
  { id: id(), category: 'transaction', name: 'USB 400', models: [...A80s, ...A920s, ...A910s] },
  { id: id(), category: 'transaction', name: 'USB 144', models: [...A910s] },
  { id: id(), category: 'transaction', name: 'WiFi ECR', models: [...A920s] },
  { id: id(), category: 'transaction', name: 'Cross App — EDC > SVC', models: ALL.filter(m => m !== 'A50') },
  { id: id(), category: 'transaction', name: 'Cross App — EDC > SCP', models: ALL.filter(m => m !== 'A50') },
  { id: id(), category: 'transaction', name: 'Cross App — wifi ECR > EDC', models: ['A50'] },
  { id: id(), category: 'transaction', name: 'AC pay > Route > EDC', models: ['A910', 'A910S_OS12'] },
  { id: id(), category: 'transaction', name: 'AC pay > Route > SVC', models: ['A910', 'A910S_OS12'] },
  { id: id(), category: 'transaction', name: '上電 Log', models: ['A80_OS10'] },

  // ═══ 結帳更新 ═══
  { id: id(), category: 'settlement', name: '其他 Aqu 有帳', models: ALL },
  { id: id(), category: 'settlement', name: '連動結帳 — 升版', models: ALL.filter(m => m !== 'A50') },
  { id: id(), category: 'settlement', name: '連動結帳 — 降版', models: ['A80', 'A80_OS10', 'A920_OS5', 'A920_Pro', 'A910', 'A50'] },
  { id: id(), category: 'settlement', name: '單結無帳 — 升版', models: ['A80', 'A80_OS10', 'A920_OS7', 'A910', 'A50'] },
  { id: id(), category: 'settlement', name: '單結無帳 — 降版', models: ['A920_OS5', 'A920_Pro', 'A50'] },
  { id: id(), category: 'settlement', name: '結帳更新 Launcher 參數', models: ['A80_OS10'] },
  { id: id(), category: 'settlement', name: '純撥接流程', models: ['A80', 'A80_OS10'] },
  { id: id(), category: 'settlement', name: '刪除 App', models: ALL },
  { id: id(), category: 'settlement', name: '刪除 App — 純撥接', models: ['A80', 'A80_OS10'] },
  { id: id(), category: 'settlement', name: '關閉撥接自我下載', models: ['A50'] },

  // ═══ 開機 ═══
  { id: id(), category: 'boot', name: '升降版', models: ALL },
  { id: id(), category: 'boot', name: 'App Del.', models: ALL },
  { id: id(), category: 'boot', name: 'App Add.', models: [...A910s, 'A50'] },
  { id: id(), category: 'boot', name: '有帳，先下載 apk 不安裝 — 結帳更新檢查，安裝', models: [...A80s, ...A910s, 'A50'] },
  { id: id(), category: 'boot', name: '資訊回報', models: ALL },
  { id: id(), category: 'boot', name: '更版', models: ['A80', 'A920_OS7'] },
  { id: id(), category: 'boot', name: '自動連線 L920', models: hasL920 },
  { id: id(), category: 'boot', name: '自動連線 B910', models: hasB910 },
  { id: id(), category: 'boot', name: '自動更新參數', models: ['A920_Pro'] },
  { id: id(), category: 'boot', name: 'Launcher 升降版', models: ['A50'] },
  { id: id(), category: 'boot', name: 'App 升降版', models: ['A50'] },

  // ═══ 外接設備 ═══
  { id: id(), category: 'external', name: '外接 A30 — 更版', models: A80s },
  { id: id(), category: 'external', name: '外接 A30 — 資訊回報', models: A80s },
  { id: id(), category: 'external', name: '外接 A30 — Log 回傳', models: A80s },
  { id: id(), category: 'external', name: 'L920 交易串接 — RS232', models: ['A920_OS5'] },
  { id: id(), category: 'external', name: 'L920 交易串接 — RS232-144', models: ['A920_OS7', 'A920_Pro'] },
  { id: id(), category: 'external', name: 'L920 交易串接 — RS232-400', models: ['A920_OS7', 'A920_Pro'] },
  { id: id(), category: 'external', name: 'B910 交易串接 — RS232_144', models: ['A910'] },
  { id: id(), category: 'external', name: 'B910 交易串接 — RS232_400', models: ['A910'] },
  { id: id(), category: 'external', name: 'B910S 交易串接 — RS232_144', models: ['A910S_OS12'] },
  { id: id(), category: 'external', name: 'B910S 交易串接 — RS232_400 — 結帳更新', models: ['A910S_OS12'] },

  // ═══ 升降版 ═══
  { id: id(), category: 'version', name: '升降版 32 → 33 → 32', models: A80s },

  // ═══ Status / Navigation Bar ═══
  { id: id(), category: 'statusbar', name: '開啟關閉的時間點 — Launcher 桌面', models: ALL },
];
