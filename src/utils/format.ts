// 金額を "¥1,350" 形式にフォーマット
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

// グラフ軸用に金額を「1.5万」「5,000」のように短くフォーマット
export function formatAxisAmount(value: number): string {
  if (value >= 10000) {
    const man = value / 10000;
    return `${Number.isInteger(man) ? man : man.toFixed(1)}万`;
  }
  return value.toLocaleString('ja-JP');
}
