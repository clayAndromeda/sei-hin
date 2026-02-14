import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { Expense } from '../types';
import { DEFAULT_CATEGORY } from '../constants/categories';

// 指定月の全レコードを取得（リアクティブ）
export function useExpensesByMonth(year: number, month: number): Expense[] {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;

  return useLiveQuery(
    () =>
      db.expenses
        .where('date')
        .between(startDate, endDate, true, true)
        .filter((e) => !e.deleted)
        .toArray(),
    [startDate, endDate],
    [],
  );
}

// 特定日のレコード一覧を取得（リアクティブ）
export function useExpensesByDate(dateString: string): Expense[] {
  return useLiveQuery(
    () =>
      db.expenses
        .where('date')
        .equals(dateString)
        .filter((e) => !e.deleted)
        .toArray(),
    [dateString],
    [],
  );
}

// 日付範囲指定でレコードを取得（リアクティブ）
export function useExpensesByDateRange(startDate: string, endDate: string): Expense[] {
  return useLiveQuery(
    () =>
      db.expenses
        .where('date')
        .between(startDate, endDate, true, true)
        .filter((e) => !e.deleted)
        .toArray(),
    [startDate, endDate],
    [],
  );
}

// 新規追加
export async function addExpense(
  date: string,
  amount: number,
  memo: string,
  category: string = DEFAULT_CATEGORY,
): Promise<void> {
  const now = new Date().toISOString();
  await db.expenses.add({
    id: crypto.randomUUID(),
    date,
    amount,
    memo,
    category,
    createdAt: now,
    updatedAt: now,
  });
}

// 更新
export async function updateExpense(
  id: string,
  amount: number,
  memo: string,
  category: string,
): Promise<void> {
  await db.expenses.update(id, {
    amount,
    memo,
    category,
    updatedAt: new Date().toISOString(),
  });
}

// 論理削除
export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.update(id, {
    deleted: true,
    updatedAt: new Date().toISOString(),
  });
}
