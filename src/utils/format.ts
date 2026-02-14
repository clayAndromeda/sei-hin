// 金額を "¥1,350" 形式にフォーマット
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}
