import { describe, it, expect } from 'vitest';
import { FOOD_SUBCATEGORIES, getFoodSubcategoryById } from './foodSubcategories';

describe('FOOD_SUBCATEGORIES', () => {
  it('間食・外食の2つが定義されている', () => {
    expect(FOOD_SUBCATEGORIES).toHaveLength(2);
  });

  it('各サブカテゴリがid, labelを持つ', () => {
    FOOD_SUBCATEGORIES.forEach((sub) => {
      expect(sub).toHaveProperty('id');
      expect(sub).toHaveProperty('label');
      expect(typeof sub.id).toBe('string');
      expect(typeof sub.label).toBe('string');
    });
  });
});

describe('getFoodSubcategoryById', () => {
  it('間食サブカテゴリを取得する', () => {
    expect(getFoodSubcategoryById('snack')).toEqual({ id: 'snack', label: '間食' });
  });

  it('外食サブカテゴリを取得する', () => {
    expect(getFoodSubcategoryById('eating_out')).toEqual({ id: 'eating_out', label: '外食' });
  });

  it('未指定（undefined）の場合はundefinedを返す', () => {
    expect(getFoodSubcategoryById(undefined)).toBeUndefined();
  });

  it('存在しないIDの場合はundefinedを返す', () => {
    expect(getFoodSubcategoryById('nonexistent')).toBeUndefined();
  });
});
