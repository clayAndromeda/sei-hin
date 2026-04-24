import { describe, it, expect } from 'vitest';
import {
  aggregateByCategory,
  buildCategoryComparison,
  categoryMapToChartData,
} from './chart';
import type { Expense } from '../types';

// テスト用のExpenseヘルパー
function createExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'test-id',
    date: '2026-02-14',
    amount: 1000,
    memo: '',
    category: 'food',
    createdAt: '2026-02-14T00:00:00Z',
    updatedAt: '2026-02-14T00:00:00Z',
    ...overrides,
  };
}

describe('aggregateByCategory', () => {
  it('空配列の場合、空のMapを返す', () => {
    const result = aggregateByCategory([]);
    expect(result.size).toBe(0);
  });

  it('単一カテゴリの合計を計算する', () => {
    const expenses = [
      createExpense({ id: '1', amount: 500 }),
      createExpense({ id: '2', amount: 300 }),
    ];
    const result = aggregateByCategory(expenses);
    expect(result.get('food')).toBe(800);
  });

  it('複数カテゴリを正しく集計する', () => {
    const expenses = [
      createExpense({ id: '1', amount: 500, category: 'food' }),
      createExpense({ id: '2', amount: 300, category: 'transport' }),
      createExpense({ id: '3', amount: 200, category: 'food' }),
    ];
    const result = aggregateByCategory(expenses);
    expect(result.get('food')).toBe(700);
    expect(result.get('transport')).toBe(300);
    expect(result.size).toBe(2);
  });

  it('categoryが未設定の場合、foodとして集計する', () => {
    const expenses = [
      createExpense({ id: '1', amount: 500, category: undefined as unknown as string }),
    ];
    const result = aggregateByCategory(expenses);
    expect(result.get('food')).toBe(500);
  });
});

describe('categoryMapToChartData', () => {
  it('Mapをチャートデータに変換する', () => {
    const totals = new Map([
      ['food', 500],
      ['transport', 300],
    ]);
    const result = categoryMapToChartData(totals);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'food',
      label: '食費',
      value: 500,
      color: '#4CAF50',
    });
    expect(result[1]).toEqual({
      id: 'transport',
      label: '交通費',
      value: 300,
      color: '#2196F3',
    });
  });

  it('空のMapの場合、空配列を返す', () => {
    const result = categoryMapToChartData(new Map());
    expect(result).toEqual([]);
  });

  it('CATEGORIESに存在しないカテゴリはフィルタされる', () => {
    const totals = new Map([
      ['food', 500],
      ['unknown_category', 100],
    ]);
    const result = categoryMapToChartData(totals);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('food');
  });

  it('CATEGORIESの定義順で出力される', () => {
    const totals = new Map([
      ['other', 100],
      ['food', 500],
      ['books', 200],
    ]);
    const result = categoryMapToChartData(totals);
    // CATEGORIES順: food, transport, entertainment, books, living, other
    expect(result.map((r) => r.id)).toEqual(['food', 'books', 'other']);
  });
});

describe('buildCategoryComparison', () => {
  it('両月とも0のカテゴリは結果に含まれない', () => {
    const current = new Map([['food', 500]]);
    const previous = new Map([['food', 300]]);
    const result = buildCategoryComparison(current, previous);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('food');
  });

  it('差分・差分%を正しく計算する', () => {
    const current = new Map([['food', 1500]]);
    const previous = new Map([['food', 1000]]);
    const [row] = buildCategoryComparison(current, previous);
    expect(row.current).toBe(1500);
    expect(row.previous).toBe(1000);
    expect(row.diff).toBe(500);
    expect(row.diffPercent).toBe(50);
  });

  it('前月0の場合、差分%はnull', () => {
    const current = new Map([['food', 500]]);
    const previous = new Map<string, number>();
    const [row] = buildCategoryComparison(current, previous);
    expect(row.diffPercent).toBeNull();
    expect(row.diff).toBe(500);
  });

  it('今月のみ0の場合、前月との差は負になる', () => {
    const current = new Map<string, number>();
    const previous = new Map([['transport', 2000]]);
    const [row] = buildCategoryComparison(current, previous);
    expect(row.current).toBe(0);
    expect(row.previous).toBe(2000);
    expect(row.diff).toBe(-2000);
    expect(row.diffPercent).toBe(-100);
  });

  it('差分の絶対値が大きい順にソートされる', () => {
    const current = new Map([
      ['food', 1000],
      ['transport', 500],
      ['books', 100],
    ]);
    const previous = new Map([
      ['food', 900], // diff +100
      ['transport', 1000], // diff -500
      ['books', 50], // diff +50
    ]);
    const result = buildCategoryComparison(current, previous);
    expect(result.map((r) => r.id)).toEqual(['transport', 'food', 'books']);
  });

  it('両Mapが空なら空配列を返す', () => {
    expect(buildCategoryComparison(new Map(), new Map())).toEqual([]);
  });

  it('CATEGORIESに存在しないカテゴリIDは結果から除外される', () => {
    // 過去に存在したが削除されたカテゴリIDが混入しても、結果には含めない
    const current = new Map([
      ['food', 500],
      ['obsolete_category', 9999],
    ]);
    const previous = new Map([
      ['obsolete_category', 8888],
    ]);
    const result = buildCategoryComparison(current, previous);
    expect(result.map((r) => r.id)).toEqual(['food']);
  });
});
