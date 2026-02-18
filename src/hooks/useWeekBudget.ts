import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';

// デフォルト週予算を取得（リアクティブ）
export function useDefaultWeekBudget(): number | null {
  const metadata = useLiveQuery(
    () => db.metadata.get('defaultWeekBudget'),
    [],
    undefined,
  );

  if (!metadata) return null;
  const parsed = parseInt(metadata.value, 10);
  return isNaN(parsed) ? null : parsed;
}

// 特定週の予算を取得（個別設定 or デフォルト、リアクティブ）
export function useWeekBudget(weekStartDate: string): number | null {
  const weekBudget = useLiveQuery(
    () => db.weekBudgets.get(weekStartDate),
    [weekStartDate],
    undefined,
  );

  const defaultBudget = useDefaultWeekBudget();

  // 個別設定が存在し、削除されていなければそれを返す
  if (weekBudget !== undefined && !weekBudget.deleted) {
    return weekBudget.budget;
  }
  return defaultBudget;
}

// デフォルト週予算を設定
export async function setDefaultWeekBudget(budget: number): Promise<void> {
  const now = new Date().toISOString();
  await db.metadata.put({
    key: 'defaultWeekBudget',
    value: String(budget),
  });
  await db.metadata.put({
    key: 'defaultWeekBudgetUpdatedAt',
    value: now,
  });
}

// 週予算を個別設定
export async function setWeekBudget(
  weekStartDate: string,
  budget: number,
): Promise<void> {
  await db.weekBudgets.put({
    weekStart: weekStartDate,
    budget,
    updatedAt: new Date().toISOString(),
  });
}

// 個別の週予算を論理削除（デフォルトに戻す）
export async function deleteWeekBudget(weekStartDate: string): Promise<void> {
  const existing = await db.weekBudgets.get(weekStartDate);
  if (existing) {
    await db.weekBudgets.put({
      ...existing,
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }
}
