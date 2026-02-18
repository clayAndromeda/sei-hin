// 1件の支出記録
export interface Expense {
  id: string; // crypto.randomUUID()
  date: string; // "YYYY-MM-DD" 形式
  amount: number; // 金額（円、整数）
  memo: string; // メモ（任意、空文字可）
  category: string; // カテゴリID（'food' | 'transport' | 'entertainment' | 'books' | 'other'）
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  deleted?: boolean; // 削除フラグ（同期用）
  isSpecial?: boolean; // 特別な支出フラグ（予算外の支出）
}

// デフォルト週予算の同期用データ
export interface DefaultWeekBudgetSync {
  budget: number;
  updatedAt: string; // ISO 8601 datetime
}

// Dropboxに保存するデータ全体
export interface SeihinData {
  version: 1 | 2 | 3;
  updatedAt: string; // ISO 8601 datetime
  expenses: Expense[];
  weekBudgets?: WeekBudget[]; // v3で追加（後方互換のためoptional）
  defaultWeekBudget?: DefaultWeekBudgetSync; // v3で追加（後方互換のためoptional）
}

// メタデータ（IndexedDB用）
export interface Metadata {
  key: string;
  value: string;
}

// 週予算（週ごとの予算設定）
export interface WeekBudget {
  weekStart: string; // 週の開始日（月曜日のYYYY-MM-DD形式）
  budget: number; // 週予算（円）
  updatedAt: string; // ISO 8601 datetime（同期マージ用）
  deleted?: boolean; // 削除フラグ（同期用）
}

// カレンダー表示モード
export type CalendarViewMode = 'weekly' | 'current-week' | 'simple';
