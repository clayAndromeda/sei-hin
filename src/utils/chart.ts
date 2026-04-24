import type { Expense } from '../types';
import { CATEGORIES } from '../constants/categories';

// カテゴリ別集計
export function aggregateByCategory(expenses: Expense[]) {
  const categoryTotals = new Map<string, number>();
  for (const e of expenses) {
    const cat = e.category ?? 'food';
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + e.amount);
  }
  return categoryTotals;
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
