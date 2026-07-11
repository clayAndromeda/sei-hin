import { useState, useEffect, useCallback, useRef } from 'react';
import { performSync } from '../services/sync';
import { isConnected, getLastSyncTime } from '../services/dropbox';
import {
  hasPendingChanges,
  clearPendingChanges,
  subscribeDataChanged,
} from '../services/syncScheduler';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // イベントハンドラから同期中かどうかを同期的に判定するためのref
  const syncingRef = useRef(false);

  // 接続状態と最終同期日時を初期化
  useEffect(() => {
    isConnected().then(setConnected);
    getLastSyncTime().then(setLastSyncTime);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!connected || syncingRef.current) return;

    syncingRef.current = true;
    setSyncStatus('syncing');
    setErrorMessage(null);

    try {
      await performSync();
      clearPendingChanges();
      setSyncStatus('success');
      const time = await getLastSyncTime();
      setLastSyncTime(time);
    } catch (error) {
      setSyncStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : '同期中にエラーが発生しました',
      );
    } finally {
      syncingRef.current = false;
    }
  }, [connected]);

  // 起動時の自動同期（前回セッションの未同期分もここでアップロードされる）
  useEffect(() => {
    if (connected) {
      triggerSync();
    }
  }, [connected, triggerSync]);

  // 30秒デバウンスの自動同期をスケジュール
  const scheduleDebouncedSync = useCallback(() => {
    if (!connected) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      triggerSync();
    }, 30_000);
  }, [connected, triggerSync]);

  // データ変更通知を購読して自動同期をスケジュールする。
  // データ層（useExpenses等）がmarkDataChanged()を呼ぶだけで同期が予約される
  useEffect(() => {
    return subscribeDataChanged(scheduleDebouncedSync);
  }, [scheduleDebouncedSync]);

  // タブが非表示になったら（タブ切替・最小化・クローズ）、デバウンスを
  // 待たずに未同期分を即時アップロードする。同期し忘れ防止のため
  useEffect(() => {
    const flushPendingSync = () => {
      if (!connected || syncingRef.current || !hasPendingChanges()) return;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      triggerSync();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSync();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    // 一部ブラウザではタブクローズ時にvisibilitychangeが飛ばないことがあるため保険
    window.addEventListener('pagehide', flushPendingSync);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushPendingSync);
    };
  }, [connected, triggerSync]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    syncStatus,
    lastSyncTime,
    errorMessage,
    connected,
    setConnected,
    triggerSync,
  };
}
