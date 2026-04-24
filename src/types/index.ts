// 1件の支出記録
export interface Expense {
  id: string; // crypto.randomUUID()
  date: string; // "YYYY-MM-DD" 形式
  amount: number; // 金額（円、整数）
  memo: string; // メモ（任意、空文字可）
  category: string; // カテゴリID（'food' | 'transport' | 'entertainment' | 'books' | 'living' | 'other'）
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
  version: 1 | 2 | 3 | 4;
  updatedAt: string; // ISO 8601 datetime
  expenses: Expense[];
  weekBudgets?: WeekBudget[]; // v3で追加（後方互換のためoptional）
  defaultWeekBudget?: DefaultWeekBudgetSync; // v3で追加（後方互換のためoptional）
  fixedCostItems?: FixedCostItem[]; // v4で追加（後方互換のためoptional）
  fixedCostAmountChanges?: FixedCostAmountChange[]; // v4で追加（後方互換のためoptional）
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

// 月固定費の項目マスター（家賃、光熱費、サブスクなど）
export interface FixedCostItem {
  id: string; // crypto.randomUUID()
  name: string; // 項目名（例: "家賃"）
  initialAmount: number; // 項目作成時の金額（startYearMonth 以降で変更がない月に適用）
  startYearMonth: string; // "YYYY-MM"（この月から項目が出現・適用される）
  endYearMonth?: string; // "YYYY-MM"（この月から項目が表示されなくなる。未設定 = 恒久）
  order: number; // 表示順
  updatedAt: string; // ISO 8601 datetime（同期マージ用）
  deleted?: boolean; // 論理削除（完全削除用、同期マージに使用。通常の「削除」操作では endYearMonth を使う）
}

// 月固定費の金額変更履歴（effective-from 方式: 指定月以降に適用）
export interface FixedCostAmountChange {
  id: string; // crypto.randomUUID()
  itemId: string; // FixedCostItem.id への参照
  effectiveYearMonth: string; // "YYYY-MM" 形式（この月から適用）
  amount: number; // 適用金額（円）
  updatedAt: string; // ISO 8601 datetime
  deleted?: boolean; // 削除フラグ（同期用）
}
