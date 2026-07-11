// 未同期の変更を追跡するための軽量な通知モジュール。
// データ層の変更系関数から markDataChanged() を呼ぶと、購読者（useSync）に
// 通知が飛び、デバウンス付き自動同期がスケジュールされる。
// 未同期フラグはlocalStorageに永続化されるため、同期が走る前にタブを
// 閉じても、次回起動時の自動同期でアップロードされる。

const PENDING_KEY = 'seihin-pending-sync';

type Listener = () => void;

const listeners = new Set<Listener>();

// localStorageが使えない環境（テスト等）でも通知自体は動くようにする
function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

// データ変更を記録し、購読者へ通知する
export function markDataChanged(): void {
  safeStorage()?.setItem(PENDING_KEY, '1');
  for (const listener of listeners) {
    listener();
  }
}

// 未同期の変更が残っているか
export function hasPendingChanges(): boolean {
  return safeStorage()?.getItem(PENDING_KEY) === '1';
}

// 同期成功後に未同期フラグをクリアする
export function clearPendingChanges(): void {
  safeStorage()?.removeItem(PENDING_KEY);
}

// データ変更通知を購読する。戻り値で購読解除
export function subscribeDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
