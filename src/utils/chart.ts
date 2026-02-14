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
