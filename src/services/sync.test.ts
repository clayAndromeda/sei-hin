import { describe, it, expect } from 'vitest';
import { mergeExpenses, mergeWeekBudgets, mergeDefaultWeekBudget } from './sync';
import type { Expense, WeekBudget, DefaultWeekBudgetSync } from '../types';

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

describe('mergeExpenses', () => {
  it('ローカルのみの場合、ローカルをそのまま返す', () => {
    const local = [createExpense({ id: '1' })];
    const result = mergeExpenses(local, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('リモートのみの場合、リモートをそのまま返す', () => {
    const remote = [createExpense({ id: '1' })];
    const result = mergeExpenses([], remote);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('両方空の場合、空配列を返す', () => {
    const result = mergeExpenses([], []);
    expect(result).toHaveLength(0);
  });

  it('同一IDでリモートが新しい場合、リモートを採用する', () => {
    const local = [
      createExpense({ id: '1', amount: 500, updatedAt: '2026-02-14T10:00:00Z' }),
    ];
    const remote = [
      createExpense({ id: '1', amount: 800, updatedAt: '2026-02-14T11:00:00Z' }),
    ];
    const result = mergeExpenses(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(800);
  });

  it('同一IDでローカルが新しい場合、ローカルを採用する', () => {
    const local = [
      createExpense({ id: '1', amount: 500, updatedAt: '2026-02-14T12:00:00Z' }),
    ];
    const remote = [
      createExpense({ id: '1', amount: 800, updatedAt: '2026-02-14T11:00:00Z' }),
    ];
    const result = mergeExpenses(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
  });

  it('同一IDでupdatedAtが同じ場合、ローカルを採用する', () => {
    const local = [
      createExpense({ id: '1', amount: 500, updatedAt: '2026-02-14T10:00:00Z' }),
    ];
    const remote = [
      createExpense({ id: '1', amount: 800, updatedAt: '2026-02-14T10:00:00Z' }),
    ];
    const result = mergeExpenses(local, remote);
    expect(result).toHaveLength(1);
    // updatedAtが同じ → リモートのupdatedAtはlocalより大きくない → ローカル維持
    expect(result[0].amount).toBe(500);
  });

  it('異なるIDの場合、両方含む', () => {
    const local = [createExpense({ id: '1', amount: 500 })];
    const remote = [createExpense({ id: '2', amount: 800 })];
    const result = mergeExpenses(local, remote);
    expect(result).toHaveLength(2);
    const ids = result.map((e) => e.id).sort();
    expect(ids).toEqual(['1', '2']);
  });

  it('論理削除されたレコードもマージに含まれる', () => {
    const local = [createExpense({ id: '1', deleted: true })];
    const remote = [createExpense({ id: '2' })];
    const result = mergeExpenses(local, remote);
    expect(result).toHaveLength(2);
    const deletedRecord = result.find((e) => e.id === '1');
    expect(deletedRecord?.deleted).toBe(true);
  });

  it('リモートで削除された場合、新しければ削除を採用する', () => {
    const local = [
      createExpense({ id: '1', deleted: false, updatedAt: '2026-02-14T10:00:00Z' }),
    ];
    const remote = [
      createExpense({ id: '1', deleted: true, updatedAt: '2026-02-14T11:00:00Z' }),
    ];
    const result = mergeExpenses(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].deleted).toBe(true);
  });

  it('多数のレコードを正しくマージする', () => {
    const local = [
      createExpense({ id: '1', amount: 100, updatedAt: '2026-02-14T10:00:00Z' }),
      createExpense({ id: '2', amount: 200, updatedAt: '2026-02-14T10:00:00Z' }),
      createExpense({ id: '3', amount: 300, updatedAt: '2026-02-14T10:00:00Z' }),
    ];
    const remote = [
      createExpense({ id: '2', amount: 250, updatedAt: '2026-02-14T11:00:00Z' }), // 更新
      createExpense({ id: '4', amount: 400, updatedAt: '2026-02-14T10:00:00Z' }), // 新規
    ];
    const result = mergeExpenses(local, remote);
    expect(result).toHaveLength(4);
    // id=2はリモートの方が新しい
    const expense2 = result.find((e) => e.id === '2');
    expect(expense2?.amount).toBe(250);
    // id=4はリモートから追加
    const expense4 = result.find((e) => e.id === '4');
    expect(expense4?.amount).toBe(400);
  });
});

// テスト用のWeekBudgetヘルパー
function createWeekBudget(overrides: Partial<WeekBudget> = {}): WeekBudget {
  return {
    weekStart: '2026-02-16',
    budget: 5000,
    updatedAt: '2026-02-16T00:00:00Z',
    ...overrides,
  };
}

describe('mergeWeekBudgets', () => {
  it('ローカルのみの場合、ローカルをそのまま返す', () => {
    const local = [createWeekBudget({ weekStart: '2026-02-16' })];
    const result = mergeWeekBudgets(local, []);
    expect(result).toHaveLength(1);
    expect(result[0].weekStart).toBe('2026-02-16');
  });

  it('リモートのみの場合、リモートをそのまま返す', () => {
    const remote = [createWeekBudget({ weekStart: '2026-02-16' })];
    const result = mergeWeekBudgets([], remote);
    expect(result).toHaveLength(1);
    expect(result[0].weekStart).toBe('2026-02-16');
  });

  it('両方空の場合、空配列を返す', () => {
    const result = mergeWeekBudgets([], []);
    expect(result).toHaveLength(0);
  });

  it('同一weekStartでリモートが新しい場合、リモートを採用する', () => {
    const local = [
      createWeekBudget({ weekStart: '2026-02-16', budget: 5000, updatedAt: '2026-02-16T10:00:00Z' }),
    ];
    const remote = [
      createWeekBudget({ weekStart: '2026-02-16', budget: 8000, updatedAt: '2026-02-16T11:00:00Z' }),
    ];
    const result = mergeWeekBudgets(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].budget).toBe(8000);
  });

  it('同一weekStartでローカルが新しい場合、ローカルを採用する', () => {
    const local = [
      createWeekBudget({ weekStart: '2026-02-16', budget: 5000, updatedAt: '2026-02-16T12:00:00Z' }),
    ];
    const remote = [
      createWeekBudget({ weekStart: '2026-02-16', budget: 8000, updatedAt: '2026-02-16T11:00:00Z' }),
    ];
    const result = mergeWeekBudgets(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].budget).toBe(5000);
  });

  it('同一weekStartでupdatedAtが同じ場合、ローカルを採用する', () => {
    const local = [
      createWeekBudget({ weekStart: '2026-02-16', budget: 5000, updatedAt: '2026-02-16T10:00:00Z' }),
    ];
    const remote = [
      createWeekBudget({ weekStart: '2026-02-16', budget: 8000, updatedAt: '2026-02-16T10:00:00Z' }),
    ];
    const result = mergeWeekBudgets(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].budget).toBe(5000);
  });

  it('異なるweekStartの場合、両方含む', () => {
    const local = [createWeekBudget({ weekStart: '2026-02-16', budget: 5000 })];
    const remote = [createWeekBudget({ weekStart: '2026-02-23', budget: 8000 })];
    const result = mergeWeekBudgets(local, remote);
    expect(result).toHaveLength(2);
    const starts = result.map((wb) => wb.weekStart).sort();
    expect(starts).toEqual(['2026-02-16', '2026-02-23']);
  });

  it('論理削除されたレコードもマージに含まれる', () => {
    const local = [createWeekBudget({ weekStart: '2026-02-16', deleted: true })];
    const remote = [createWeekBudget({ weekStart: '2026-02-23' })];
    const result = mergeWeekBudgets(local, remote);
    expect(result).toHaveLength(2);
    const deleted = result.find((wb) => wb.weekStart === '2026-02-16');
    expect(deleted?.deleted).toBe(true);
  });

  it('リモートで削除された場合、新しければ削除を採用する', () => {
    const local = [
      createWeekBudget({ weekStart: '2026-02-16', deleted: false, updatedAt: '2026-02-16T10:00:00Z' }),
    ];
    const remote = [
      createWeekBudget({ weekStart: '2026-02-16', deleted: true, updatedAt: '2026-02-16T11:00:00Z' }),
    ];
    const result = mergeWeekBudgets(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].deleted).toBe(true);
  });

  it('多数のレコードを正しくマージする', () => {
    const local = [
      createWeekBudget({ weekStart: '2026-02-02', budget: 3000, updatedAt: '2026-02-02T10:00:00Z' }),
      createWeekBudget({ weekStart: '2026-02-09', budget: 4000, updatedAt: '2026-02-09T10:00:00Z' }),
      createWeekBudget({ weekStart: '2026-02-16', budget: 5000, updatedAt: '2026-02-16T10:00:00Z' }),
    ];
    const remote = [
      createWeekBudget({ weekStart: '2026-02-09', budget: 6000, updatedAt: '2026-02-09T11:00:00Z' }),
      createWeekBudget({ weekStart: '2026-02-23', budget: 7000, updatedAt: '2026-02-23T10:00:00Z' }),
    ];
    const result = mergeWeekBudgets(local, remote);
    expect(result).toHaveLength(4);
    // 2026-02-09はリモートの方が新しい
    const wb09 = result.find((wb) => wb.weekStart === '2026-02-09');
    expect(wb09?.budget).toBe(6000);
    // 2026-02-23はリモートから追加
    const wb23 = result.find((wb) => wb.weekStart === '2026-02-23');
    expect(wb23?.budget).toBe(7000);
  });
});

describe('mergeDefaultWeekBudget', () => {
  it('両方nullの場合、nullを返す', () => {
    const result = mergeDefaultWeekBudget(null, null);
    expect(result).toBeNull();
  });

  it('ローカルのみの場合、ローカルを返す', () => {
    const local: DefaultWeekBudgetSync = { budget: 5000, updatedAt: '2026-02-16T10:00:00Z' };
    const result = mergeDefaultWeekBudget(local, null);
    expect(result).toEqual(local);
  });

  it('リモートのみの場合、リモートを返す', () => {
    const remote: DefaultWeekBudgetSync = { budget: 8000, updatedAt: '2026-02-16T10:00:00Z' };
    const result = mergeDefaultWeekBudget(null, remote);
    expect(result).toEqual(remote);
  });

  it('リモートが新しい場合、リモートを採用する', () => {
    const local: DefaultWeekBudgetSync = { budget: 5000, updatedAt: '2026-02-16T10:00:00Z' };
    const remote: DefaultWeekBudgetSync = { budget: 8000, updatedAt: '2026-02-16T11:00:00Z' };
    const result = mergeDefaultWeekBudget(local, remote);
    expect(result?.budget).toBe(8000);
  });

  it('ローカルが新しい場合、ローカルを採用する', () => {
    const local: DefaultWeekBudgetSync = { budget: 5000, updatedAt: '2026-02-16T12:00:00Z' };
    const remote: DefaultWeekBudgetSync = { budget: 8000, updatedAt: '2026-02-16T11:00:00Z' };
    const result = mergeDefaultWeekBudget(local, remote);
    expect(result?.budget).toBe(5000);
  });

  it('updatedAtが同じ場合、ローカルを採用する', () => {
    const local: DefaultWeekBudgetSync = { budget: 5000, updatedAt: '2026-02-16T10:00:00Z' };
    const remote: DefaultWeekBudgetSync = { budget: 8000, updatedAt: '2026-02-16T10:00:00Z' };
    const result = mergeDefaultWeekBudget(local, remote);
    expect(result?.budget).toBe(5000);
  });
});
