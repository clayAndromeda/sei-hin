import { useState, useEffect, useCallback, useRef } from 'react';
import { performSync } from '../services/sync';
import { isConnected, getLastSyncTime } from '../services/dropbox';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 接続状態と最終同期日時を初期化
  useEffect(() => {
    isConnected().then(setConnected);
    getLastSyncTime().then(setLastSyncTime);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!connected) return;

    setSyncStatus('syncing');
    setErrorMessage(null);

    try {
      await performSync();
      setSyncStatus('success');
      const time = await getLastSyncTime();
      setLastSyncTime(time);
    } catch (error) {
      setSyncStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : '同期中にエラーが発生しました',
      );
    }
  }, [connected]);

  // 起動時の自動同期
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
      triggerSync();
    }, 30_000);
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
    scheduleDebouncedSync,
  };
}
