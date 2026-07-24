import { describe, it, expect } from 'vitest';
import { formatCurrency, formatAxisAmount } from './format';

describe('formatCurrency', () => {
  it('金額を¥付きカンマ区切りでフォーマットする', () => {
    expect(formatCurrency(1350)).toBe('¥1,350');
  });

  it('0円をフォーマットする', () => {
    expect(formatCurrency(0)).toBe('¥0');
  });

  it('大きな金額をフォーマットする', () => {
    expect(formatCurrency(1000000)).toBe('¥1,000,000');
  });

  it('カンマ不要の金額をフォーマットする', () => {
    expect(formatCurrency(500)).toBe('¥500');
  });

  it('負の金額をフォーマットする', () => {
    // toLocaleStringの挙動に依存
    const result = formatCurrency(-1000);
    expect(result).toContain('1,000');
    expect(result).toContain('-');
  });
});

describe('formatAxisAmount', () => {
  it('1万以上は「万」表記にする', () => {
    expect(formatAxisAmount(10000)).toBe('1万');
    expect(formatAxisAmount(15000)).toBe('1.5万');
    expect(formatAxisAmount(120000)).toBe('12万');
  });

  it('1万未満はカンマ区切りにする', () => {
    expect(formatAxisAmount(5000)).toBe('5,000');
    expect(formatAxisAmount(0)).toBe('0');
  });
});
