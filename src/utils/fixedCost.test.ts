import { describe, it, expect } from 'vitest';
import {
  formatYearMonth,
  currentYearMonth,
  isPastYearMonth,
  resolveAmountForMonth,
  resolveMonthlyFixedCosts,
  sumMonthlyFixedCosts,
} from './fixedCost';
import type { FixedCostAmountChange, FixedCostItem } from '../types';

function createItem(overrides: Partial<FixedCostItem> = {}): FixedCostItem {
  return {
    id: 'item-1',
    name: '家賃',
    initialAmount: 80000,
    startYearMonth: '1970-01',
    order: 0,
    updatedAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function createChange(
  overrides: Partial<FixedCostAmountChange> = {},
): FixedCostAmountChange {
  return {
    id: 'change-1',
    itemId: 'item-1',
    effectiveYearMonth: '2026-05',
    amount: 10000,
    updatedAt: '2026-04-15T00:00:00Z',
    ...overrides,
  };
}

describe('formatYearMonth', () => {
  it('月番号を0埋めする', () => {
    expect(formatYearMonth(2026, 0)).toBe('2026-01');
    expect(formatYearMonth(2026, 8)).toBe('2026-09');
    expect(formatYearMonth(2026, 11)).toBe('2026-12');
  });
});

describe('currentYearMonth', () => {
  it('指定した日付の年月を返す', () => {
    expect(currentYearMonth(new Date('2026-04-24T00:00:00Z'))).toBe('2026-04');
  });
});

describe('isPastYearMonth', () => {
  const now = new Date('2026-04-24T00:00:00Z');

  it('当月より前は true', () => {
    expect(isPastYearMonth('2026-03', now)).toBe(true);
    expect(isPastYearMonth('2025-12', now)).toBe(true);
  });

  it('当月は false', () => {
    expect(isPastYearMonth('2026-04', now)).toBe(false);
  });

  it('未来月は false', () => {
    expect(isPastYearMonth('2026-05', now)).toBe(false);
    expect(isPastYearMonth('2027-01', now)).toBe(false);
  });
});

describe('resolveAmountForMonth', () => {
  it('変更履歴がない場合、initialAmount を返す', () => {
    const item = createItem({ initialAmount: 80000 });
    const result = resolveAmountForMonth(item, [], '2026-05');
    expect(result.amount).toBe(80000);
    expect(result.changedFrom).toBeUndefined();
  });

  it('発効月より前の月は initialAmount を返す', () => {
    const item = createItem({ initialAmount: 8000 });
    const changes = [createChange({ effectiveYearMonth: '2026-05', amount: 10000 })];
    const result = resolveAmountForMonth(item, changes, '2026-04');
    expect(result.amount).toBe(8000);
    expect(result.changedFrom).toBeUndefined();
  });

  it('発効月と同じ月は変更後の金額を返す', () => {
    const item = createItem({ initialAmount: 8000 });
    const changes = [createChange({ effectiveYearMonth: '2026-05', amount: 10000 })];
    const result = resolveAmountForMonth(item, changes, '2026-05');
    expect(result.amount).toBe(10000);
    expect(result.changedFrom).toBe('2026-05');
  });

  it('発効月以降は変更後の金額を引き継ぐ', () => {
    const item = createItem({ initialAmount: 8000 });
    const changes = [createChange({ effectiveYearMonth: '2026-05', amount: 10000 })];
    const result = resolveAmountForMonth(item, changes, '2026-08');
    expect(result.amount).toBe(10000);
    expect(result.changedFrom).toBe('2026-05');
  });

  it('複数の変更履歴があれば、対象月以前で最も新しい発効月を採用する', () => {
    const item = createItem({ initialAmount: 8000 });
    const changes = [
      createChange({ id: 'c1', effectiveYearMonth: '2026-05', amount: 10000 }),
      createChange({ id: 'c2', effectiveYearMonth: '2026-09', amount: 12000 }),
    ];
    expect(resolveAmountForMonth(item, changes, '2026-04').amount).toBe(8000);
    expect(resolveAmountForMonth(item, changes, '2026-05').amount).toBe(10000);
    expect(resolveAmountForMonth(item, changes, '2026-08').amount).toBe(10000);
    expect(resolveAmountForMonth(item, changes, '2026-09').amount).toBe(12000);
    expect(resolveAmountForMonth(item, changes, '2027-01').amount).toBe(12000);
  });

  it('deleted の変更履歴は無視される', () => {
    const item = createItem({ initialAmount: 8000 });
    const changes = [
      createChange({ effectiveYearMonth: '2026-05', amount: 10000, deleted: true }),
    ];
    const result = resolveAmountForMonth(item, changes, '2026-06');
    expect(result.amount).toBe(8000);
    expect(result.changedFrom).toBeUndefined();
  });

  it('他の itemId の変更履歴は無視される', () => {
    const item = createItem({ id: 'item-1', initialAmount: 8000 });
    const changes = [
      createChange({ itemId: 'item-2', effectiveYearMonth: '2026-05', amount: 99999 }),
    ];
    const result = resolveAmountForMonth(item, changes, '2026-06');
    expect(result.amount).toBe(8000);
  });

  it('同じ発効月に複数レコードがある場合、updatedAt が新しい方を採用する', () => {
    const item = createItem({ initialAmount: 8000 });
    const changes = [
      createChange({
        id: 'c1',
        effectiveYearMonth: '2026-05',
        amount: 10000,
        updatedAt: '2026-04-15T00:00:00Z',
      }),
      createChange({
        id: 'c2',
        effectiveYearMonth: '2026-05',
        amount: 11000,
        updatedAt: '2026-04-20T00:00:00Z',
      }),
    ];
    const result = resolveAmountForMonth(item, changes, '2026-05');
    expect(result.amount).toBe(11000);
  });
});

describe('resolveMonthlyFixedCosts', () => {
  it('複数項目をorder順に解決する', () => {
    const items = [
      createItem({ id: 'a', name: '電気代', order: 1, initialAmount: 8000 }),
      createItem({ id: 'b', name: '家賃', order: 0, initialAmount: 80000 }),
    ];
    const result = resolveMonthlyFixedCosts(items, [], '2026-05');
    expect(result).toHaveLength(2);
    expect(result[0].item.name).toBe('家賃');
    expect(result[0].amount).toBe(80000);
    expect(result[1].item.name).toBe('電気代');
    expect(result[1].amount).toBe(8000);
  });

  it('deleted の項目は除外される', () => {
    const items = [
      createItem({ id: 'a', order: 0, deleted: true }),
      createItem({ id: 'b', order: 1 }),
    ];
    const result = resolveMonthlyFixedCosts(items, [], '2026-05');
    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe('b');
  });

  it('startYearMonth より前の月では項目が表示されない', () => {
    const items = [
      createItem({ id: 'a', order: 0, startYearMonth: '2026-05' }),
    ];
    expect(resolveMonthlyFixedCosts(items, [], '2026-04')).toHaveLength(0);
    expect(resolveMonthlyFixedCosts(items, [], '2026-05')).toHaveLength(1);
    expect(resolveMonthlyFixedCosts(items, [], '2026-06')).toHaveLength(1);
  });

  it('endYearMonth 以降は項目が表示されない（過去月には残る）', () => {
    const items = [
      createItem({
        id: 'a',
        order: 0,
        startYearMonth: '2026-01',
        endYearMonth: '2026-06',
      }),
    ];
    expect(resolveMonthlyFixedCosts(items, [], '2026-05')).toHaveLength(1);
    expect(resolveMonthlyFixedCosts(items, [], '2026-06')).toHaveLength(0);
    expect(resolveMonthlyFixedCosts(items, [], '2026-07')).toHaveLength(0);
    expect(resolveMonthlyFixedCosts(items, [], '2025-12')).toHaveLength(0); // startYearMonth より前
  });

  it('start === end の場合、どの月にも表示されない（実質的に削除）', () => {
    const items = [
      createItem({
        id: 'a',
        order: 0,
        startYearMonth: '2026-05',
        endYearMonth: '2026-05',
      }),
    ];
    expect(resolveMonthlyFixedCosts(items, [], '2026-04')).toHaveLength(0);
    expect(resolveMonthlyFixedCosts(items, [], '2026-05')).toHaveLength(0);
    expect(resolveMonthlyFixedCosts(items, [], '2026-06')).toHaveLength(0);
  });

  it('startYearMonthごとに有効月が違う複数項目を正しく扱う', () => {
    const items = [
      createItem({ id: 'rent', order: 0, startYearMonth: '2026-01', initialAmount: 80000 }),
      createItem({ id: 'sub', order: 1, startYearMonth: '2026-05', initialAmount: 1500 }),
    ];
    const apr = resolveMonthlyFixedCosts(items, [], '2026-04');
    expect(apr).toHaveLength(1);
    expect(apr[0].item.id).toBe('rent');

    const may = resolveMonthlyFixedCosts(items, [], '2026-05');
    expect(may).toHaveLength(2);
  });

  it('変更履歴を項目ごとに反映する', () => {
    const items = [
      createItem({ id: 'a', order: 0, initialAmount: 80000 }),
      createItem({ id: 'b', order: 1, initialAmount: 8000 }),
    ];
    const changes = [
      createChange({ itemId: 'b', effectiveYearMonth: '2026-05', amount: 10000 }),
    ];
    const result = resolveMonthlyFixedCosts(items, changes, '2026-06');
    expect(result[0].amount).toBe(80000); // 家賃は変更なし
    expect(result[1].amount).toBe(10000); // 電気代は変更
    expect(result[1].changedFrom).toBe('2026-05');
  });
});

describe('sumMonthlyFixedCosts', () => {
  it('resolvedの金額合計を返す', () => {
    const resolved = [
      { item: createItem({ id: 'a' }), amount: 80000 },
      { item: createItem({ id: 'b' }), amount: 10000 },
    ];
    expect(sumMonthlyFixedCosts(resolved)).toBe(90000);
  });

  it('空配列なら0を返す', () => {
    expect(sumMonthlyFixedCosts([])).toBe(0);
  });
});
