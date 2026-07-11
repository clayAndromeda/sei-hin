import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  markDataChanged,
  hasPendingChanges,
  clearPendingChanges,
  subscribeDataChanged,
} from './syncScheduler';

// テスト環境（node）にはlocalStorageがないためインメモリ実装で代用
function createStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe('syncScheduler', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('markDataChangedで未同期フラグが立つ', () => {
    expect(hasPendingChanges()).toBe(false);
    markDataChanged();
    expect(hasPendingChanges()).toBe(true);
  });

  it('clearPendingChangesでフラグがクリアされる', () => {
    markDataChanged();
    clearPendingChanges();
    expect(hasPendingChanges()).toBe(false);
  });

  it('markDataChangedで購読者に通知される', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDataChanged(listener);

    markDataChanged();
    expect(listener).toHaveBeenCalledTimes(1);

    markDataChanged();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('購読解除後は通知されない', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDataChanged(listener);
    unsubscribe();

    markDataChanged();
    expect(listener).not.toHaveBeenCalled();
  });

  it('複数の購読者に通知される', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsub1 = subscribeDataChanged(listener1);
    const unsub2 = subscribeDataChanged(listener2);

    markDataChanged();
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
  });

  it('localStorageが使えなくても通知は動作する', () => {
    vi.unstubAllGlobals();
    const listener = vi.fn();
    const unsubscribe = subscribeDataChanged(listener);

    expect(() => markDataChanged()).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(hasPendingChanges()).toBe(false);

    unsubscribe();
  });
});
