import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { markDataChanged } from '../services/syncScheduler';
import type { DayMemo } from '../types';

// 特定日のメモ本文を取得（リアクティブ）。未設定・削除済みなら空文字
export function useDayMemo(dateString: string): string {
  const dayMemo = useLiveQuery(
    () => (dateString ? db.dayMemos.get(dateString) : undefined),
    [dateString],
    undefined,
  );

  if (!dayMemo || dayMemo.deleted) return '';
  return dayMemo.text;
}

// 日付範囲のメモ一覧を取得（リアクティブ、削除済みと空メモは除外）
export function useDayMemosByDateRange(
  startDate: string,
  endDate: string,
): DayMemo[] {
  return useLiveQuery(
    () =>
      db.dayMemos
        .where('date')
        .between(startDate, endDate, true, true)
        .filter((m) => !m.deleted && m.text.trim().length > 0)
        .toArray(),
    [startDate, endDate],
    [],
  );
}

// 日別メモを保存。空文字（空白のみ含む）の場合は論理削除する
export async function setDayMemo(dateString: string, text: string): Promise<void> {
  const trimmed = text.trim();
  const now = new Date().toISOString();
  const existing = await db.dayMemos.get(dateString);

  if (trimmed.length === 0) {
    // 未保存の日に空メモを保存しようとした場合は何もしない（不要なレコードを作らない）
    if (!existing || existing.deleted) return;
    await db.dayMemos.put({ ...existing, text: '', deleted: true, updatedAt: now });
    markDataChanged();
    return;
  }

  // 内容に変更がなければ書き込まない（同期の無駄打ちを防ぐ）
  if (existing && !existing.deleted && existing.text === trimmed) return;

  await db.dayMemos.put({ date: dateString, text: trimmed, updatedAt: now });
  markDataChanged();
}

// 日別メモを論理削除
export async function deleteDayMemo(dateString: string): Promise<void> {
  await setDayMemo(dateString, '');
}
