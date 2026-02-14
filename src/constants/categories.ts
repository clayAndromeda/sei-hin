// ジャンル（カテゴリ）定義
export const CATEGORIES = [
  { id: 'food', label: '食費', color: '#4CAF50' },
  { id: 'transport', label: '交通費', color: '#2196F3' },
  { id: 'entertainment', label: '娯楽費', color: '#FF9800' },
  { id: 'books', label: '書籍代', color: '#9C27B0' },
  { id: 'other', label: 'その他', color: '#607D8B' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const DEFAULT_CATEGORY: CategoryId = 'food';

// IDからカテゴリ情報を取得
export function getCategoryById(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[4]; // 見つからなければ「その他」
}
