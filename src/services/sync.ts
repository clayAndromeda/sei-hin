import { db } from './db';
import { downloadFile, uploadFile } from './dropbox';
import type {
  Expense,
  SeihinData,
  WeekBudget,
  DefaultWeekBudgetSync,
  FixedCostItem,
  FixedCostAmountChange,
} from '../types';

// マージロジック: 両方のリストをID基準でマージ
export function mergeExpenses(
  local: Expense[],
  remote: Expense[],
): Expense[] {
  const merged = new Map<string, Expense>();

  // ローカルをまず全部入れる
  for (const e of local) {
    merged.set(e.id, e);
  }

  // リモートとマージ（updatedAtが新しい方を採用）
  for (const e of remote) {
    const existing = merged.get(e.id);
    if (!existing || e.updatedAt > existing.updatedAt) {
      merged.set(e.id, e);
    }
  }

  // 空メモを「（なし）」に正規化
  return Array.from(merged.values()).map((e) => ({
    ...e,
    memo: !e.memo || e.memo.trim() === '' ? '（なし）' : e.memo,
  }));
}

// 週予算のマージロジック: weekStartをキーにupdatedAtで新しい方を採用
export function mergeWeekBudgets(
  local: WeekBudget[],
  remote: WeekBudget[],
): WeekBudget[] {
  const merged = new Map<string, WeekBudget>();

  for (const wb of local) {
    merged.set(wb.weekStart, wb);
  }

  for (const wb of remote) {
    const existing = merged.get(wb.weekStart);
    if (!existing || wb.updatedAt > existing.updatedAt) {
      merged.set(wb.weekStart, wb);
    }
  }

  return Array.from(merged.values());
}

// デフォルト週予算のマージ（updatedAtが新しい方を採用）
export function mergeDefaultWeekBudget(
  local: DefaultWeekBudgetSync | null,
  remote: DefaultWeekBudgetSync | null,
): DefaultWeekBudgetSync | null {
  if (!local) return remote;
  if (!remote) return local;
  return remote.updatedAt > local.updatedAt ? remote : local;
}

// ローカルのdefaultWeekBudgetをmetadataから取得
async function getLocalDefaultWeekBudget(): Promise<DefaultWeekBudgetSync | null> {
  const budgetMeta = await db.metadata.get('defaultWeekBudget');
  const updatedAtMeta = await db.metadata.get('defaultWeekBudgetUpdatedAt');

  if (!budgetMeta) return null;
  const budget = parseInt(budgetMeta.value, 10);
  if (isNaN(budget)) return null;

  return {
    budget,
    updatedAt: updatedAtMeta?.value ?? '1970-01-01T00:00:00.000Z',
  };
}

// マージ済みdefaultWeekBudgetをmetadataに保存
async function saveLocalDefaultWeekBudget(data: DefaultWeekBudgetSync): Promise<void> {
  await db.metadata.put({ key: 'defaultWeekBudget', value: String(data.budget) });
  await db.metadata.put({ key: 'defaultWeekBudgetUpdatedAt', value: data.updatedAt });
}

// リモートデータからweekBudgetsを安全に取り出す（後方互換）
function extractRemoteWeekBudgets(data: SeihinData): WeekBudget[] {
  return (data.weekBudgets ?? []).map((wb) => ({
    ...wb,
    updatedAt: wb.updatedAt ?? '1970-01-01T00:00:00.000Z',
  }));
}

// 固定費項目のマージ: idをキーにupdatedAtで新しい方を採用
export function mergeFixedCostItems(
  local: FixedCostItem[],
  remote: FixedCostItem[],
): FixedCostItem[] {
  const merged = new Map<string, FixedCostItem>();

  for (const item of local) {
    merged.set(item.id, item);
  }

  for (const item of remote) {
    const existing = merged.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      merged.set(item.id, item);
    }
  }

  return Array.from(merged.values());
}

// 固定費変更履歴のマージ: idをキーにupdatedAtで新しい方を採用
export function mergeFixedCostAmountChanges(
  local: FixedCostAmountChange[],
  remote: FixedCostAmountChange[],
): FixedCostAmountChange[] {
  const merged = new Map<string, FixedCostAmountChange>();

  for (const c of local) {
    merged.set(c.id, c);
  }

  for (const c of remote) {
    const existing = merged.get(c.id);
    if (!existing || c.updatedAt > existing.updatedAt) {
      merged.set(c.id, c);
    }
  }

  return Array.from(merged.values());
}

// 同期の排他制御用フラグ
let isSyncing = false;

// 同期を実行
export async function performSync(): Promise<void> {
  if (isSyncing) {
    throw new Error('同期処理が既に実行中です');
  }

  isSyncing = true;
  try {
    // 1. ローカルの全データを取得（削除済み含む）
    const localExpenses = await db.expenses.toArray();
    const localWeekBudgets = await db.weekBudgets.toArray();
    const localDefaultWB = await getLocalDefaultWeekBudget();
    const localFixedCostItems = await db.fixedCostItems.toArray();
    const localFixedCostChanges = await db.fixedCostAmountChanges.toArray();

    // 2. Dropboxからダウンロード
    const downloaded = await downloadFile();

    let mergedExpenses: Expense[];
    let mergedWeekBudgets: WeekBudget[];
    let mergedDefaultWB: DefaultWeekBudgetSync | null;
    let mergedFixedCostItems: FixedCostItem[];
    let mergedFixedCostChanges: FixedCostAmountChange[];
    let rev: string | undefined;

    if (downloaded) {
      // リモートデータにcategoryがない場合はデフォルト値を補完
      const remoteExpenses = downloaded.data.expenses.map((e) => ({
        ...e,
        category: e.category ?? 'food',
        isSpecial: e.isSpecial ?? false,
      }));
      const remoteWeekBudgets = extractRemoteWeekBudgets(downloaded.data);
      const remoteDefaultWB = downloaded.data.defaultWeekBudget ?? null;
      const remoteFixedCostItems = downloaded.data.fixedCostItems ?? [];
      const remoteFixedCostChanges = downloaded.data.fixedCostAmountChanges ?? [];

      // 3. マージ
      mergedExpenses = mergeExpenses(localExpenses, remoteExpenses);
      mergedWeekBudgets = mergeWeekBudgets(localWeekBudgets, remoteWeekBudgets);
      mergedDefaultWB = mergeDefaultWeekBudget(localDefaultWB, remoteDefaultWB);
      mergedFixedCostItems = mergeFixedCostItems(
        localFixedCostItems,
        remoteFixedCostItems,
      );
      mergedFixedCostChanges = mergeFixedCostAmountChanges(
        localFixedCostChanges,
        remoteFixedCostChanges,
      );
      rev = downloaded.rev;
    } else {
      // Dropboxにファイルがない場合はローカルのみ
      mergedExpenses = localExpenses;
      mergedWeekBudgets = localWeekBudgets;
      mergedDefaultWB = localDefaultWB;
      mergedFixedCostItems = localFixedCostItems;
      mergedFixedCostChanges = localFixedCostChanges;
    }

    // 4. ローカルに保存（一括置換）
    await db.transaction(
      'rw',
      db.expenses,
      db.weekBudgets,
      db.fixedCostItems,
      db.fixedCostAmountChanges,
      async () => {
        await db.expenses.clear();
        await db.expenses.bulkAdd(mergedExpenses);
        await db.weekBudgets.clear();
        await db.weekBudgets.bulkAdd(mergedWeekBudgets);
        await db.fixedCostItems.clear();
        await db.fixedCostItems.bulkAdd(mergedFixedCostItems);
        await db.fixedCostAmountChanges.clear();
        await db.fixedCostAmountChanges.bulkAdd(mergedFixedCostChanges);
      },
    );
    if (mergedDefaultWB) {
      await saveLocalDefaultWeekBudget(mergedDefaultWB);
    }

    // 5. Dropboxにアップロード
    const dataToUpload: SeihinData = {
      version: 4,
      updatedAt: new Date().toISOString(),
      expenses: mergedExpenses,
      weekBudgets: mergedWeekBudgets,
      defaultWeekBudget: mergedDefaultWB ?? undefined,
      fixedCostItems: mergedFixedCostItems,
      fixedCostAmountChanges: mergedFixedCostChanges,
    };

    try {
      await uploadFile(dataToUpload, rev);
    } catch (error) {
      // 競合エラーの場合は再試行
      if (isConflictError(error)) {
        const retryDownload = await downloadFile();
        if (retryDownload) {
          const retryRemote = retryDownload.data.expenses.map((e) => ({
            ...e,
            category: e.category ?? 'food',
            isSpecial: e.isSpecial ?? false,
          }));
          const retryRemoteWB = extractRemoteWeekBudgets(retryDownload.data);
          const retryRemoteDefaultWB = retryDownload.data.defaultWeekBudget ?? null;
          const retryRemoteFCI = retryDownload.data.fixedCostItems ?? [];
          const retryRemoteFCC = retryDownload.data.fixedCostAmountChanges ?? [];

          const retryMergedExpenses = mergeExpenses(mergedExpenses, retryRemote);
          const retryMergedWB = mergeWeekBudgets(mergedWeekBudgets, retryRemoteWB);
          const retryMergedDefaultWB = mergeDefaultWeekBudget(mergedDefaultWB, retryRemoteDefaultWB);
          const retryMergedFCI = mergeFixedCostItems(
            mergedFixedCostItems,
            retryRemoteFCI,
          );
          const retryMergedFCC = mergeFixedCostAmountChanges(
            mergedFixedCostChanges,
            retryRemoteFCC,
          );

          await db.transaction(
            'rw',
            db.expenses,
            db.weekBudgets,
            db.fixedCostItems,
            db.fixedCostAmountChanges,
            async () => {
              await db.expenses.clear();
              await db.expenses.bulkAdd(retryMergedExpenses);
              await db.weekBudgets.clear();
              await db.weekBudgets.bulkAdd(retryMergedWB);
              await db.fixedCostItems.clear();
              await db.fixedCostItems.bulkAdd(retryMergedFCI);
              await db.fixedCostAmountChanges.clear();
              await db.fixedCostAmountChanges.bulkAdd(retryMergedFCC);
            },
          );
          if (retryMergedDefaultWB) {
            await saveLocalDefaultWeekBudget(retryMergedDefaultWB);
          }

          const retryData: SeihinData = {
            version: 4,
            updatedAt: new Date().toISOString(),
            expenses: retryMergedExpenses,
            weekBudgets: retryMergedWB,
            defaultWeekBudget: retryMergedDefaultWB ?? undefined,
            fixedCostItems: retryMergedFCI,
            fixedCostAmountChanges: retryMergedFCC,
          };
          await uploadFile(retryData, retryDownload.rev);
        }
      } else {
        throw error;
      }
    }

    // 6. 削除済みレコードを物理削除
    const deletedExpenseIds = mergedExpenses.filter((e) => e.deleted).map((e) => e.id);
    if (deletedExpenseIds.length > 0) {
      await db.expenses.bulkDelete(deletedExpenseIds);
    }

    const deletedWBKeys = mergedWeekBudgets
      .filter((wb) => wb.deleted)
      .map((wb) => wb.weekStart);
    if (deletedWBKeys.length > 0) {
      await db.weekBudgets.bulkDelete(deletedWBKeys);
    }

    const deletedFCIIds = mergedFixedCostItems
      .filter((i) => i.deleted)
      .map((i) => i.id);
    if (deletedFCIIds.length > 0) {
      await db.fixedCostItems.bulkDelete(deletedFCIIds);
    }

    const deletedFCCIds = mergedFixedCostChanges
      .filter((c) => c.deleted)
      .map((c) => c.id);
    if (deletedFCCIds.length > 0) {
      await db.fixedCostAmountChanges.bulkDelete(deletedFCCIds);
    }

    // 7. 最終同期日時を保存
    await db.metadata.put({ key: 'lastSync', value: new Date().toISOString() });
  } finally {
    isSyncing = false;
  }
}

function isConflictError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    (error as { status: number }).status === 409
  );
}
