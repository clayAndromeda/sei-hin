import { describe, it, expect } from 'vitest';
import { CATEGORIES, DEFAULT_CATEGORY, getCategoryById } from './categories';

describe('CATEGORIES', () => {
  it('5つのカテゴリが定義されている', () => {
    expect(CATEGORIES).toHaveLength(5);
  });

  it('各カテゴリがid, label, colorを持つ', () => {
    CATEGORIES.forEach((cat) => {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('color');
      expect(typeof cat.id).toBe('string');
      expect(typeof cat.label).toBe('string');
      expect(cat.color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });
});

describe('DEFAULT_CATEGORY', () => {
  it('foodがデフォルトカテゴリである', () => {
    expect(DEFAULT_CATEGORY).toBe('food');
  });
});

describe('getCategoryById', () => {
  it('食費カテゴリを取得する', () => {
    const cat = getCategoryById('food');
    expect(cat).toEqual({ id: 'food', label: '食費', color: '#4CAF50' });
  });

  it('交通費カテゴリを取得する', () => {
    const cat = getCategoryById('transport');
    expect(cat).toEqual({ id: 'transport', label: '交通費', color: '#2196F3' });
  });

  it('娯楽費カテゴリを取得する', () => {
    const cat = getCategoryById('entertainment');
    expect(cat).toEqual({ id: 'entertainment', label: '娯楽費', color: '#FF9800' });
  });

  it('書籍代カテゴリを取得する', () => {
    const cat = getCategoryById('books');
    expect(cat).toEqual({ id: 'books', label: '書籍代', color: '#9C27B0' });
  });

  it('その他カテゴリを取得する', () => {
    const cat = getCategoryById('other');
    expect(cat).toEqual({ id: 'other', label: 'その他', color: '#607D8B' });
  });

  it('存在しないIDの場合「その他」を返す', () => {
    const cat = getCategoryById('nonexistent');
    expect(cat.id).toBe('other');
    expect(cat.label).toBe('その他');
  });

  it('空文字の場合「その他」を返す', () => {
    const cat = getCategoryById('');
    expect(cat.id).toBe('other');
  });
});
