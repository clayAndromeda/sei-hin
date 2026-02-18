import Dexie, { type Table } from 'dexie';
import type { Expense, Metadata, WeekBudget } from '../types';

export class SeihinDB extends Dexie {
  expenses!: Table<Expense, string>;
  metadata!: Table<Metadata, string>;
  weekBudgets!: Table<WeekBudget, string>;

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
  }
}

export const db = new SeihinDB();
