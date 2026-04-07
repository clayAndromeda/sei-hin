import { useCallback, useEffect, useState } from 'react';

// localStorageに状態を永続化するカスタムフック
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // パース失敗時は初期値を使う
    }
    return initialValue;
  });

  // 状態が変わったらlocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // 書き込み失敗は無視（容量超過など）
    }
  }, [key, state]);

  // 他タブでの変更を反映
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setState(JSON.parse(e.newValue) as T);
      } catch {
        // パース失敗時は無視
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  const set = useCallback((value: T | ((prev: T) => T)) => {
    setState(value);
  }, []);

  return [state, set];
}
