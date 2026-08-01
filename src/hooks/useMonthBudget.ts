import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { markDataChanged } from '../services/syncScheduler';

// デフォルト月予算（固定費+変動費を合わせた月全体の予算）を取得（リアクティブ）
export function useDefaultMonthBudget(): number | null {
  const metadata = useLiveQuery(
    () => db.metadata.get('defaultMonthBudget'),
    [],
    undefined,
  );

  if (!metadata) return null;
  const parsed = parseInt(metadata.value, 10);
  return isNaN(parsed) ? null : parsed;
}

// デフォルト月予算を設定
export async function setDefaultMonthBudget(budget: number): Promise<void> {
  const now = new Date().toISOString();
  await db.metadata.put({
    key: 'defaultMonthBudget',
    value: String(budget),
  });
  await db.metadata.put({
    key: 'defaultMonthBudgetUpdatedAt',
    value: now,
  });
  markDataChanged();
}

// 特定月の予算を取得（個別設定 or デフォルト、リアクティブ）
export function useMonthBudget(yearMonth: string): number | null {
  const monthBudget = useLiveQuery(
    () => db.monthBudgets.get(yearMonth),
    [yearMonth],
    undefined,
  );

  const defaultBudget = useDefaultMonthBudget();

  // 個別設定が存在し、削除されていなければそれを返す
  if (monthBudget !== undefined && !monthBudget.deleted) {
    return monthBudget.budget;
  }
  return defaultBudget;
}

// 月予算を個別設定
export async function setMonthBudget(
  yearMonth: string,
  budget: number,
): Promise<void> {
  await db.monthBudgets.put({
    yearMonth,
    budget,
    updatedAt: new Date().toISOString(),
  });
  markDataChanged();
}

// 個別の月予算を論理削除（デフォルトに戻す）
export async function deleteMonthBudget(yearMonth: string): Promise<void> {
  const existing = await db.monthBudgets.get(yearMonth);
  if (existing) {
    await db.monthBudgets.put({
      ...existing,
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
    markDataChanged();
  }
}
