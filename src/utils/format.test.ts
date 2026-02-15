import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format';

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
