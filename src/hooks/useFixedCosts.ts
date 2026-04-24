import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { FixedCostAmountChange, FixedCostItem } from '../types';
import {
  resolveMonthlyFixedCosts,
  sumMonthlyFixedCosts,
  type ResolvedFixedCost,
} from '../utils/fixedCost';

// アクティブな固定費項目一覧（論理削除除外、order昇順）
export function useFixedCostItems(): FixedCostItem[] {
  return useLiveQuery(
    () =>
      db.fixedCostItems
        .filter((i) => !i.deleted)
        .toArray()
        .then((items) => items.sort((a, b) => a.order - b.order)),
    [],
    [],
  );
}

// 全変更履歴（削除済みを含む全て、解決ロジックでフィルタリング）
export function useFixedCostAmountChanges(): FixedCostAmountChange[] {
  return useLiveQuery(() => db.fixedCostAmountChanges.toArray(), [], []);
}

export interface MonthlyFixedCostsResult {
  resolved: ResolvedFixedCost[];
  total: number;
}

// 指定月（"YYYY-MM"）の固定費一覧と合計
export function useMonthlyFixedCosts(
  yearMonth: string,
): MonthlyFixedCostsResult {
  const items = useFixedCostItems();
  const changes = useFixedCostAmountChanges();
  const resolved = resolveMonthlyFixedCosts(items, changes, yearMonth);
  return { resolved, total: sumMonthlyFixedCosts(resolved) };
}

// 項目を追加
// order はタイムスタンプ + ランダム値の複合（異デバイス同秒追加でも衝突ほぼなし）。
// 新しい項目ほど末尾に並ぶ。
// startYearMonth 以降の月でのみ表示・集計される。
export async function addFixedCostItem(
  name: string,
  initialAmount: number,
  startYearMonth: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.fixedCostItems.add({
    id: crypto.randomUUID(),
    name,
    initialAmount,
    startYearMonth,
    order: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    updatedAt: now,
  });
}

// 項目の名前だけ更新（全月に影響）
export async function renameFixedCostItem(
  id: string,
  name: string,
): Promise<void> {
  await db.fixedCostItems.update(id, {
    name,
    updatedAt: new Date().toISOString(),
  });
}

// 指定月以降の金額を設定する（effective-from 方式）
// - 常に fixedCostAmountChanges に 1 レコードを作成/更新する
// - initialAmount（項目作成時の金額）は不変。変更はすべて change レコードで履歴管理
// - 既存の同月 change があれば amount を上書き、なければ新規追加
export async function setAmountForMonth(
  itemId: string,
  yearMonth: string,
  amount: number,
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.fixedCostAmountChanges
    .where('[itemId+effectiveYearMonth]')
    .equals([itemId, yearMonth])
    .filter((c) => !c.deleted)
    .first();

  if (existing) {
    await db.fixedCostAmountChanges.update(existing.id, {
      amount,
      updatedAt: now,
    });
    return;
  }

  await db.fixedCostAmountChanges.add({
    id: crypto.randomUUID(),
    itemId,
    effectiveYearMonth: yearMonth,
    amount,
    updatedAt: now,
  });
}

// 項目を「この月以降」終了させる（過去月には残る）
// - startYearMonth === yearMonth の場合: 過去データが一切ないので deleted: true で完全削除
//   （sync 時に物理削除される。endYearMonth だけ立てると孤立レコードが永遠に運ばれる）
//   関連する fixedCostAmountChanges も論理削除して Dropbox に孤立レコードを残さない
// - それ以外: endYearMonth = yearMonth を設定し、yearMonth以降は非表示
export async function endFixedCostItem(
  id: string,
  yearMonth: string,
): Promise<void> {
  const item = await db.fixedCostItems.get(id);
  if (!item) throw new Error(`固定費項目が見つかりません: ${id}`);
  const now = new Date().toISOString();

  if (item.startYearMonth === yearMonth) {
    await db.fixedCostItems.update(id, {
      deleted: true,
      updatedAt: now,
    });
    // 参照整合性: 項目を完全削除する際は関連 change もすべて論理削除
    await db.fixedCostAmountChanges
      .where('itemId')
      .equals(id)
      .filter((c) => !c.deleted)
      .modify((c) => {
        c.deleted = true;
        c.updatedAt = now;
      });
    return;
  }

  await db.fixedCostItems.update(id, {
    endYearMonth: yearMonth,
    updatedAt: now,
  });
}

// 「この月以降」の金額変更を論理削除（前の金額に戻す）
export async function clearAmountChange(
  itemId: string,
  effectiveYearMonth: string,
): Promise<void> {
  const existing = await db.fixedCostAmountChanges
    .where('[itemId+effectiveYearMonth]')
    .equals([itemId, effectiveYearMonth])
    .filter((c) => !c.deleted)
    .first();

  if (!existing) return;

  await db.fixedCostAmountChanges.update(existing.id, {
    deleted: true,
    updatedAt: new Date().toISOString(),
  });
}
