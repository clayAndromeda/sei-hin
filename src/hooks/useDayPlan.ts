import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { markDataChanged } from '../services/syncScheduler';
import type { DayPlan } from '../types';

// 特定日の予定を取得（リアクティブ）。未設定・削除済みならnull
export function useDayPlan(dateString: string): DayPlan | null {
  const dayPlan = useLiveQuery(
    () => (dateString ? db.dayPlans.get(dateString) : undefined),
    [dateString],
    undefined,
  );

  if (!dayPlan || dayPlan.deleted) return null;
  return dayPlan;
}

// 日付範囲の予定一覧を取得（リアクティブ、削除済みと0円は除外）
export function useDayPlansByDateRange(
  startDate: string,
  endDate: string,
): DayPlan[] {
  return useLiveQuery(
    () =>
      db.dayPlans
        .where('date')
        .between(startDate, endDate, true, true)
        .filter((p) => !p.deleted && p.amount > 0)
        .toArray(),
    [startDate, endDate],
    [],
  );
}

// 日別予定を保存。金額が0以下なら論理削除する
export async function setDayPlan(
  dateString: string,
  amount: number,
  memo: string,
): Promise<void> {
  const now = new Date().toISOString();
  const trimmedMemo = memo.trim();
  const existing = await db.dayPlans.get(dateString);

  if (!Number.isFinite(amount) || amount <= 0) {
    // 未保存の日に0円を保存しようとした場合は何もしない（不要なレコードを作らない）
    if (!existing || existing.deleted) return;
    await db.dayPlans.put({
      ...existing,
      amount: 0,
      memo: '',
      deleted: true,
      updatedAt: now,
    });
    markDataChanged();
    return;
  }

  // 内容に変更がなければ書き込まない（同期の無駄打ちを防ぐ）
  if (
    existing &&
    !existing.deleted &&
    existing.amount === amount &&
    existing.memo === trimmedMemo
  ) {
    return;
  }

  await db.dayPlans.put({
    date: dateString,
    amount,
    memo: trimmedMemo,
    updatedAt: now,
  });
  markDataChanged();
}

// 日別予定を論理削除
export async function deleteDayPlan(dateString: string): Promise<void> {
  await setDayPlan(dateString, 0, '');
}
