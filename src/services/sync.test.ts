import { describe, it, expect } from 'vitest';
import { mergeExpenses } from './sync';
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
