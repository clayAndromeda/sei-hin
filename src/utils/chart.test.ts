import { describe, it, expect } from 'vitest';
import { aggregateByCategory, categoryMapToChartData } from './chart';
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
    // CATEGORIES順: food, transport, entertainment, books, other
    expect(result.map((r) => r.id)).toEqual(['food', 'books', 'other']);
  });
});
