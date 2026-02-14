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
  }
}

export const db = new SeihinDB();
