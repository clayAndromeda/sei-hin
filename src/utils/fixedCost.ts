import type { FixedCostAmountChange, FixedCostItem } from '../types';

export interface ResolvedFixedCost {
  item: FixedCostItem;
  amount: number;
  changedFrom?: string; // 適用中の変更レコードの effectiveYearMonth（初期金額のままなら undefined）
}

// 年月文字列を正規化（"YYYY-M" → "YYYY-MM"）。比較は辞書順で行うため0埋め必須。
export function formatYearMonth(year: number, month0Based: number): string {
  const mm = String(month0Based + 1).padStart(2, '0');
  return `${year}-${mm}`;
}

// "YYYY-MM" を日本語表示用の "YYYY年M月" に整形
export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}年${parseInt(month, 10)}月`;
}

// 今日の年月を "YYYY-MM" で返す
export function currentYearMonth(now: Date = new Date()): string {
  return formatYearMonth(now.getFullYear(), now.getMonth());
}

// 指定年月が今月より前（過去月）かを返す
export function isPastYearMonth(
  yearMonth: string,
  now: Date = new Date(),
): boolean {
  return yearMonth < currentYearMonth(now);
}

// 指定月における項目の金額を解決する
// - その月以前で最も新しい effectiveYearMonth の amount を採用
// - 同月に複数レコードがある場合は updatedAt が新しい方を採用
// - 該当なしなら initialAmount
export function resolveAmountForMonth(
  item: FixedCostItem,
  changes: FixedCostAmountChange[],
  yearMonth: string,
): { amount: number; changedFrom?: string } {
  const applicable = changes
    .filter(
      (c) =>
        c.itemId === item.id &&
        !c.deleted &&
        c.effectiveYearMonth <= yearMonth,
    )
    .sort((a, b) => {
      if (a.effectiveYearMonth !== b.effectiveYearMonth) {
        return b.effectiveYearMonth.localeCompare(a.effectiveYearMonth);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  const latest = applicable[0];
  if (!latest) {
    return { amount: item.initialAmount };
  }
  return { amount: latest.amount, changedFrom: latest.effectiveYearMonth };
}

// 特定月の全項目の解決結果
// - deleted: true の項目は除外（完全削除）
// - startYearMonth > yearMonth（まだ発効していない月）の項目も除外
// - endYearMonth <= yearMonth（終了した月以降）の項目も除外
export function resolveMonthlyFixedCosts(
  items: FixedCostItem[],
  changes: FixedCostAmountChange[],
  yearMonth: string,
): ResolvedFixedCost[] {
  return items
    .filter(
      (i) =>
        !i.deleted &&
        i.startYearMonth <= yearMonth &&
        (!i.endYearMonth || yearMonth < i.endYearMonth),
    )
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const { amount, changedFrom } = resolveAmountForMonth(
        item,
        changes,
        yearMonth,
      );
      return { item, amount, changedFrom };
    });
}

// 月の合計固定費
export function sumMonthlyFixedCosts(resolved: ResolvedFixedCost[]): number {
  return resolved.reduce((sum, r) => sum + r.amount, 0);
}
