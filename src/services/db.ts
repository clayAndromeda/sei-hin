import Dexie, { type Table } from 'dexie';
import type {
  Expense,
  FixedCostAmountChange,
  FixedCostItem,
  Metadata,
  WeekBudget,
} from '../types';

export class SeihinDB extends Dexie {
  expenses!: Table<Expense, string>;
  metadata!: Table<Metadata, string>;
  weekBudgets!: Table<WeekBudget, string>;
  fixedCostItems!: Table<FixedCostItem, string>;
  fixedCostAmountChanges!: Table<FixedCostAmountChange, string>;

  constructor() {
    super('seihin');
    this.version(1).stores({
      expenses: 'id, date, createdAt, updatedAt',
      metadata: 'key',
    });

    // v2: categoryフィールド追加
    this.version(2)
      .stores({
        expenses: 'id, date, category, createdAt, updatedAt',
        metadata: 'key',
      })
      .upgrade((tx) => {
        // 既存レコードにデフォルトカテゴリを設定
        return tx
          .table('expenses')
          .toCollection()
          .modify((expense) => {
            if (!expense.category) {
              expense.category = 'food';
            }
          });
      });

    // v3: 週予算テーブル追加
    this.version(3).stores({
      expenses: 'id, date, category, createdAt, updatedAt',
      metadata: 'key',
      weekBudgets: 'weekStart',
    });

    // v4: isSpecialフィールド追加
    this.version(4)
      .stores({
        expenses: 'id, date, category, createdAt, updatedAt',
        metadata: 'key',
        weekBudgets: 'weekStart',
      })
      .upgrade((tx) => {
        // 既存レコードにデフォルト値を設定
        return tx
          .table('expenses')
          .toCollection()
          .modify((expense) => {
            if (expense.isSpecial === undefined) {
              expense.isSpecial = false;
            }
          });
      });

    // v5: WeekBudgetにupdatedAt, deletedフィールド追加（同期対応）
    this.version(5)
      .stores({
        expenses: 'id, date, category, createdAt, updatedAt',
        metadata: 'key',
        weekBudgets: 'weekStart',
      })
      .upgrade((tx) => {
        const now = new Date().toISOString();
        return tx
          .table('weekBudgets')
          .toCollection()
          .modify((weekBudget) => {
            if (!weekBudget.updatedAt) {
              weekBudget.updatedAt = now;
            }
          });
      });
    // v6: 既存の空メモを「（なし）」に更新
    this.version(6)
      .stores({
        expenses: 'id, date, category, createdAt, updatedAt',
        metadata: 'key',
        weekBudgets: 'weekStart',
      })
      .upgrade((tx) => {
        return tx
          .table('expenses')
          .toCollection()
          .modify((expense) => {
            if (!expense.memo || expense.memo.trim() === '') {
              expense.memo = '（なし）';
            }
          });
      });

    // v7: 月固定費テーブル追加
    this.version(7).stores({
      expenses: 'id, date, category, createdAt, updatedAt',
      metadata: 'key',
      weekBudgets: 'weekStart',
      fixedCostItems: 'id, order, updatedAt',
      fixedCostAmountChanges:
        'id, itemId, effectiveYearMonth, updatedAt, [itemId+effectiveYearMonth]',
    });

    // v8: FixedCostItem に startYearMonth フィールドを追加
    this.version(8)
      .stores({
        expenses: 'id, date, category, createdAt, updatedAt',
        metadata: 'key',
        weekBudgets: 'weekStart',
        fixedCostItems: 'id, order, startYearMonth, updatedAt',
        fixedCostAmountChanges:
          'id, itemId, effectiveYearMonth, updatedAt, [itemId+effectiveYearMonth]',
      })
      .upgrade((tx) => {
        // 既存レコードには過去月から有効な値を設定（実質的に全月に出現）
        return tx
          .table('fixedCostItems')
          .toCollection()
          .modify((item) => {
            if (!item.startYearMonth) {
              item.startYearMonth = '1970-01';
            }
          });
      });

    // v9: FixedCostItem に endYearMonth フィールドを追加（終了月の管理）
    this.version(9).stores({
      expenses: 'id, date, category, createdAt, updatedAt',
      metadata: 'key',
      weekBudgets: 'weekStart',
      fixedCostItems: 'id, order, startYearMonth, endYearMonth, updatedAt',
      fixedCostAmountChanges:
        'id, itemId, effectiveYearMonth, updatedAt, [itemId+effectiveYearMonth]',
    });
  }
}

export const db = new SeihinDB();
