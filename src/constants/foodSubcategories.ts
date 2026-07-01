// 食費のサブカテゴリ定義（間食の無駄遣いなどを把握するため）
export const FOOD_SUBCATEGORIES = [
  { id: 'snack', label: '間食' },
  { id: 'eating_out', label: '外食' },
] as const;

export type FoodSubcategoryId = (typeof FOOD_SUBCATEGORIES)[number]['id'];

// IDからサブカテゴリ情報を取得（未分類の場合はundefined）
export function getFoodSubcategoryById(id: string | undefined) {
  if (!id) return undefined;
  return FOOD_SUBCATEGORIES.find((s) => s.id === id);
}
