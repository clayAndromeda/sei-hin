// 月予算の消化状況・月末予測の計算（純粋関数）

export interface MonthBudgetStatusInput {
  budget: number; // 月予算（固定費+変動費、円）
  variableSpent: number; // 変動費の支出合計（特別な支出も含む、円）
  fixedCostTotal: number; // 固定費合計（円）
  daysElapsed: number; // 経過日数（当月なら今日の日付、過去月なら月の日数）
  daysInMonth: number; // 月の日数
  isCurrentMonth: boolean; // 表示中の月が今月かどうか
}

export interface MonthBudgetStatus {
  spent: number; // 支出合計（変動費+固定費）
  remaining: number; // 予算残額（負なら超過分）
  progress: number; // 予算消化率（0〜100にキャップ）
  isOver: boolean; // 既に予算超過しているか
  projectedTotal: number | null; // 現在のペースでの月末支出予測（当月のみ、それ以外はnull）
  willExceed: boolean; // 月末予測が予算を超えそうか（当月のみtrueになりうる）
  dailyAllowance: number | null; // 残り日数で1日あたり使える変動費（当月のみ、超過時は0）
  remainingDays: number; // 今日を含む残り日数（当月以外は0）
}

// 月予算に対する現在の消化状況と、今のペースで使い続けた場合の月末予測を計算する
export function calcMonthBudgetStatus(
  input: MonthBudgetStatusInput,
): MonthBudgetStatus {
  const {
    budget,
    variableSpent,
    fixedCostTotal,
    daysElapsed,
    daysInMonth,
    isCurrentMonth,
  } = input;

  const spent = variableSpent + fixedCostTotal;
  const remaining = budget - spent;
  const isOver = spent > budget;
  const progress =
    budget > 0 ? Math.min((spent / budget) * 100, 100) : spent > 0 ? 100 : 0;

  // 月末予測: 変動費を日割りペースで月末まで伸ばし、固定費は満額加算する
  let projectedTotal: number | null = null;
  let willExceed = false;
  if (isCurrentMonth && daysElapsed > 0) {
    projectedTotal =
      Math.round((variableSpent / daysElapsed) * daysInMonth) + fixedCostTotal;
    willExceed = projectedTotal > budget;
  }

  // 残り日数（今日を含む）と、1日あたり使える変動費
  const remainingDays = isCurrentMonth
    ? Math.max(daysInMonth - daysElapsed + 1, 0)
    : 0;
  let dailyAllowance: number | null = null;
  if (isCurrentMonth && remainingDays > 0) {
    // 今日の支出は既にspentに含まれているため、残額を今日を除く残り日数ではなく
    // 「明日以降+今日の追加分」の目安として今日を含む日数で割る
    dailyAllowance = Math.max(Math.floor(remaining / remainingDays), 0);
  }

  return {
    spent,
    remaining,
    progress,
    isOver,
    projectedTotal,
    willExceed,
    dailyAllowance,
    remainingDays,
  };
}
