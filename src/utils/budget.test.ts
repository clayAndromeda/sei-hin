import { describe, it, expect } from 'vitest';
import { calcMonthBudgetStatus } from './budget';

describe('calcMonthBudgetStatus', () => {
  it('予算内の場合、残額と消化率を正しく計算する', () => {
    const status = calcMonthBudgetStatus({
      budget: 100000,
      variableSpent: 30000,
      fixedCostTotal: 20000,
      daysElapsed: 15,
      daysInMonth: 30,
      isCurrentMonth: true,
    });
    expect(status.spent).toBe(50000);
    expect(status.remaining).toBe(50000);
    expect(status.progress).toBe(50);
    expect(status.isOver).toBe(false);
  });

  it('予算超過の場合、isOverがtrueになり残額が負になる', () => {
    const status = calcMonthBudgetStatus({
      budget: 50000,
      variableSpent: 40000,
      fixedCostTotal: 20000,
      daysElapsed: 20,
      daysInMonth: 31,
      isCurrentMonth: true,
    });
    expect(status.isOver).toBe(true);
    expect(status.remaining).toBe(-10000);
    expect(status.progress).toBe(100); // 100%にキャップされる
  });

  it('当月の場合、変動費の日割りペース+固定費満額で月末を予測する', () => {
    // 変動費30000円/15日 → 1日2000円ペース → 30日で60000円 + 固定費20000円 = 80000円
    const status = calcMonthBudgetStatus({
      budget: 100000,
      variableSpent: 30000,
      fixedCostTotal: 20000,
      daysElapsed: 15,
      daysInMonth: 30,
      isCurrentMonth: true,
    });
    expect(status.projectedTotal).toBe(80000);
    expect(status.willExceed).toBe(false);
  });

  it('現在のペースで予算を超えそうな場合、willExceedがtrueになる', () => {
    // 変動費60000円/15日 → 30日で120000円 + 固定費20000円 = 140000円 > 予算100000円
    const status = calcMonthBudgetStatus({
      budget: 100000,
      variableSpent: 60000,
      fixedCostTotal: 20000,
      daysElapsed: 15,
      daysInMonth: 30,
      isCurrentMonth: true,
    });
    expect(status.projectedTotal).toBe(140000);
    expect(status.willExceed).toBe(true);
    expect(status.isOver).toBe(false); // まだ超過はしていない
  });

  it('当月以外の場合、月末予測は行わない', () => {
    const status = calcMonthBudgetStatus({
      budget: 100000,
      variableSpent: 60000,
      fixedCostTotal: 20000,
      daysElapsed: 30,
      daysInMonth: 30,
      isCurrentMonth: false,
    });
    expect(status.projectedTotal).toBeNull();
    expect(status.willExceed).toBe(false);
    expect(status.dailyAllowance).toBeNull();
    expect(status.remainingDays).toBe(0);
  });

  it('残り日数と1日あたり使える金額を計算する', () => {
    // 残額50000円、残り16日（今日含む） → 1日3125円
    const status = calcMonthBudgetStatus({
      budget: 100000,
      variableSpent: 30000,
      fixedCostTotal: 20000,
      daysElapsed: 15,
      daysInMonth: 30,
      isCurrentMonth: true,
    });
    expect(status.remainingDays).toBe(16);
    expect(status.dailyAllowance).toBe(3125);
  });

  it('予算超過時の1日あたり使える金額は0になる', () => {
    const status = calcMonthBudgetStatus({
      budget: 50000,
      variableSpent: 40000,
      fixedCostTotal: 20000,
      daysElapsed: 20,
      daysInMonth: 31,
      isCurrentMonth: true,
    });
    expect(status.dailyAllowance).toBe(0);
  });

  it('月初1日目でも月末予測が計算できる', () => {
    // 変動費5000円/1日 → 31日で155000円 + 固定費0円
    const status = calcMonthBudgetStatus({
      budget: 100000,
      variableSpent: 5000,
      fixedCostTotal: 0,
      daysElapsed: 1,
      daysInMonth: 31,
      isCurrentMonth: true,
    });
    expect(status.projectedTotal).toBe(155000);
    expect(status.willExceed).toBe(true);
  });

  it('予算0円で支出がある場合、消化率は100になる', () => {
    const status = calcMonthBudgetStatus({
      budget: 0,
      variableSpent: 1000,
      fixedCostTotal: 0,
      daysElapsed: 5,
      daysInMonth: 30,
      isCurrentMonth: true,
    });
    expect(status.progress).toBe(100);
    expect(status.isOver).toBe(true);
  });

  it('予算0円で支出もない場合、消化率は0で超過ではない', () => {
    const status = calcMonthBudgetStatus({
      budget: 0,
      variableSpent: 0,
      fixedCostTotal: 0,
      daysElapsed: 5,
      daysInMonth: 30,
      isCurrentMonth: true,
    });
    expect(status.progress).toBe(0);
    expect(status.isOver).toBe(false);
  });
});
