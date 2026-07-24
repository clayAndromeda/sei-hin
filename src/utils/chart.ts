import type { Expense } from '../types';
import { CATEGORIES } from '../constants/categories';
import { FOOD_SUBCATEGORIES } from '../constants/foodSubcategories';
import { addDaysToDateString } from './date';

// カテゴリ別集計
export function aggregateByCategory(expenses: Expense[]) {
  const categoryTotals = new Map<string, number>();
  for (const e of expenses) {
    const cat = e.category ?? 'food';
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + e.amount);
  }
  return categoryTotals;
}

// 食費のサブカテゴリ別集計（間食などの無駄遣いを把握するため）
export function aggregateFoodBySubcategory(expenses: Expense[]) {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    if (e.category !== 'food' || !e.subcategory) continue;
    totals.set(e.subcategory, (totals.get(e.subcategory) ?? 0) + e.amount);
  }
  return totals;
}

// 食費のサブカテゴリ別回数集計（外食・間食の頻度を把握するため）
export function aggregateFoodSubcategoryCount(expenses: Expense[]) {
  const counts = new Map<string, number>();
  for (const e of expenses) {
    if (e.category !== 'food' || !e.subcategory) continue;
    counts.set(e.subcategory, (counts.get(e.subcategory) ?? 0) + 1);
  }
  return counts;
}

export interface MonthlySubcategoryCount {
  yearMonth: string; // "YYYY-MM"
  label: string; // "2月"
  counts: Record<string, number>; // サブカテゴリID -> 回数
}

// 外食・間食の回数の月次推移（endYear/endMonthを含む直近monthCountヶ月分、古い順）
// expensesにはあらかじめ対象期間全体の支出を渡す
export function buildFoodSubcategoryMonthlyTrend(
  expenses: Expense[],
  endYear: number,
  endMonth: number, // 0-indexed
  monthCount: number,
): MonthlySubcategoryCount[] {
  const result: MonthlySubcategoryCount[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(endYear, endMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
    const monthExpenses = expenses.filter((e) => e.date.startsWith(ym));
    const counts: Record<string, number> = {};
    for (const sub of FOOD_SUBCATEGORIES) {
      counts[sub.id] = monthExpenses.filter(
        (e) => e.category === 'food' && e.subcategory === sub.id,
      ).length;
    }
    result.push({ yearMonth: ym, label: `${m + 1}月`, counts });
  }
  return result;
}

// 期間（月・週）ごとのカテゴリ別支出合計
export interface PeriodCategoryTotal {
  key: string; // 月: "YYYY-MM"、週: 週開始日 "YYYY-MM-DD"
  label: string; // 月: "2月"、週: "2/9"
  totals: Record<string, number>; // カテゴリID -> 金額（0円のカテゴリは含まない）
  total: number; // 期間の合計金額
}

// Map<string, number> を Record に変換（0円は除く）
function categoryMapToRecord(totals: Map<string, number>): Record<string, number> {
  const record: Record<string, number> = {};
  for (const [id, amount] of totals) {
    if (amount > 0) record[id] = amount;
  }
  return record;
}

// カテゴリ別支出の月次推移（endYear/endMonthを含む直近monthCountヶ月分、古い順）
// expensesにはあらかじめ対象期間全体の支出を渡す
export function buildMonthlyCategoryTrend(
  expenses: Expense[],
  endYear: number,
  endMonth: number, // 0-indexed
  monthCount: number,
): PeriodCategoryTotal[] {
  const result: PeriodCategoryTotal[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(endYear, endMonth - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthExpenses = expenses.filter((e) => e.date.startsWith(ym));
    const totals = categoryMapToRecord(aggregateByCategory(monthExpenses));
    result.push({
      key: ym,
      label: `${d.getMonth() + 1}月`,
      totals,
      total: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    });
  }
  return result;
}

// カテゴリ別支出の週次推移（endWeekStartの週を含む直近weekCount週分、古い順）
// endWeekStartは週開始日（月曜）の "YYYY-MM-DD" 文字列
export function buildWeeklyCategoryTrend(
  expenses: Expense[],
  endWeekStart: string,
  weekCount: number,
): PeriodCategoryTotal[] {
  const result: PeriodCategoryTotal[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const start = addDaysToDateString(endWeekStart, -7 * i);
    const end = addDaysToDateString(start, 6);
    const weekExpenses = expenses.filter((e) => e.date >= start && e.date <= end);
    const totals = categoryMapToRecord(aggregateByCategory(weekExpenses));
    const [, m, d] = start.split('-');
    result.push({
      key: start,
      label: `${parseInt(m, 10)}/${parseInt(d, 10)}`,
      totals,
      total: weekExpenses.reduce((sum, e) => sum + e.amount, 0),
    });
  }
  return result;
}

// Rechartsのデータ形式に変換
export function categoryMapToChartData(categoryTotals: Map<string, number>) {
  return CATEGORIES.filter((cat) => categoryTotals.has(cat.id)).map((cat) => ({
    id: cat.id,
    label: cat.label,
    value: categoryTotals.get(cat.id) ?? 0,
    color: cat.color,
  }));
}

// カテゴリ別前月比較データ（差分の絶対値が大きい順にソート）
export interface CategoryComparison {
  id: string;
  label: string;
  color: string;
  current: number;
  previous: number;
  diff: number;
  // 前月が0円（=新規カテゴリ）のときは null、それ以外は整数パーセント
  diffPercent: number | null;
}

export function buildCategoryComparison(
  currentTotals: Map<string, number>,
  previousTotals: Map<string, number>,
): CategoryComparison[] {
  const result: CategoryComparison[] = [];
  for (const cat of CATEGORIES) {
    const current = currentTotals.get(cat.id) ?? 0;
    const previous = previousTotals.get(cat.id) ?? 0;
    if (current === 0 && previous === 0) continue;
    const diff = current - previous;
    const diffPercent = previous > 0 ? Math.round((diff / previous) * 100) : null;
    result.push({
      id: cat.id,
      label: cat.label,
      color: cat.color,
      current,
      previous,
      diff,
      diffPercent,
    });
  }
  // 差分の絶対値が大きい順
  result.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return result;
}
