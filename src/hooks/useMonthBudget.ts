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
