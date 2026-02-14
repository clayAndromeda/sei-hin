import { db } from './db';
import { downloadFile, uploadFile } from './dropbox';
import type { Expense, SeihinData } from '../types';

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

    // 2. Dropboxからダウンロード
    const downloaded = await downloadFile();

    let mergedExpenses: Expense[];
    let rev: string | undefined;

    if (downloaded) {
      // リモートデータにcategoryがない場合はデフォルト値を補完
      const remoteExpenses = downloaded.data.expenses.map((e) => ({
        ...e,
        category: e.category ?? 'food',
      }));
      // 3. マージ
      mergedExpenses = mergeExpenses(localExpenses, remoteExpenses);
      rev = downloaded.rev;
    } else {
      // Dropboxにファイルがない場合はローカルのみ
      mergedExpenses = localExpenses;
    }

    // 4. ローカルに保存（一括置換）
    await db.transaction('rw', db.expenses, async () => {
      await db.expenses.clear();
      await db.expenses.bulkAdd(mergedExpenses);
    });

    // 5. Dropboxにアップロード
    const dataToUpload: SeihinData = {
      version: 2,
      updatedAt: new Date().toISOString(),
      expenses: mergedExpenses,
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
          }));
          const retryMerged = mergeExpenses(mergedExpenses, retryRemote);

          await db.transaction('rw', db.expenses, async () => {
            await db.expenses.clear();
            await db.expenses.bulkAdd(retryMerged);
          });

          const retryData: SeihinData = {
            version: 2,
            updatedAt: new Date().toISOString(),
            expenses: retryMerged,
          };
          await uploadFile(retryData, retryDownload.rev);
        }
      } else {
        throw error;
      }
    }

    // 6. 削除済みレコードを物理削除
    const deletedIds = mergedExpenses.filter((e) => e.deleted).map((e) => e.id);
    if (deletedIds.length > 0) {
      await db.expenses.bulkDelete(deletedIds);
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
