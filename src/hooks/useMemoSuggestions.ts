import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';

/** メモごとの集計統計 */
interface MemoStats {
  memo: string;
  /** 過去に記録された金額一覧（中央値計算用にソート済み） */
  amounts: number[];
  /** 時間帯別の出現回数（0-23時） */
  hourCounts: number[];
  /** 総出現回数 */
  totalCount: number;
  /** 最も多く使われたカテゴリ */
  topCategory: string;
}

/** サジェスト候補 */
export interface MemoSuggestion {
  memo: string;
  score: number;
  topCategory: string;
}

/**
 * 過去の支出データからメモの統計サマリーを構築する。
 * ダイアログが開かれたタイミングで1回だけ実行し、結果をキャッシュする。
 */
async function buildMemoStatsMap(): Promise<Map<string, MemoStats>> {
  const statsMap = new Map<string, MemoStats>();

  // 全支出を一括取得（削除済みは除外）
  // Dexieのeach()でストリーミング処理し、メモリに全レコードを保持しない
  await db.expenses
    .filter((e) => !e.deleted)
    .each((expense) => {
      const { memo, amount, createdAt, category } = expense;
      if (!memo || memo === '（なし）') return;

      let stats = statsMap.get(memo);
      if (!stats) {
        stats = {
          memo,
          amounts: [],
          hourCounts: new Array(24).fill(0),
          totalCount: 0,
          topCategory: category,
        };
        statsMap.set(memo, stats);
      }

      stats.amounts.push(amount);
      stats.totalCount++;

      // createdAtから時間帯を抽出
      const hour = new Date(createdAt).getHours();
      stats.hourCounts[hour]++;
    });

  // 各メモの金額リストをソート（中央値計算の高速化）& 最頻カテゴリの算出
  // カテゴリ算出のために再度eachするのは無駄なので、別途集計
  // → カテゴリは頻度集計が必要なので、別の方法で処理
  await resolveTopCategories(statsMap);

  for (const stats of statsMap.values()) {
    stats.amounts.sort((a, b) => a - b);
  }

  return statsMap;
}

/**
 * 各メモについて最頻カテゴリを算出する
 */
async function resolveTopCategories(statsMap: Map<string, MemoStats>): Promise<void> {
  const categoryCounts = new Map<string, Map<string, number>>();

  await db.expenses
    .filter((e) => !e.deleted && !!e.memo && e.memo !== '（なし）')
    .each((expense) => {
      const { memo, category } = expense;
      let counts = categoryCounts.get(memo);
      if (!counts) {
        counts = new Map();
        categoryCounts.set(memo, counts);
      }
      counts.set(category, (counts.get(category) || 0) + 1);
    });

  for (const [memo, counts] of categoryCounts) {
    const stats = statsMap.get(memo);
    if (!stats) continue;
    let maxCount = 0;
    let topCat = stats.topCategory;
    for (const [cat, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        topCat = cat;
      }
    }
    stats.topCategory = topCat;
  }
}

/**
 * 金額の近さスコア（0〜1）。
 * 入力金額と過去金額の中央値との比率で計算。完全一致で1.0。
 */
function amountScore(inputAmount: number, sortedAmounts: number[]): number {
  if (sortedAmounts.length === 0 || inputAmount <= 0) return 0;

  // 中央値を使用（外れ値に強い）
  const mid = Math.floor(sortedAmounts.length / 2);
  const median =
    sortedAmounts.length % 2 === 1
      ? sortedAmounts[mid]
      : (sortedAmounts[mid - 1] + sortedAmounts[mid]) / 2;

  if (median === 0) return 0;

  // 比率ベースのスコア: ratio=1で最大、離れるほど減衰
  const ratio = inputAmount / median;
  // ガウシアン的な減衰: exp(-((ln(ratio))^2) / (2 * sigma^2))
  // sigma=0.5 で、2倍/半分の金額で約0.25のスコア
  const logRatio = Math.log(ratio);
  return Math.exp(-(logRatio * logRatio) / (2 * 0.5 * 0.5));
}

/**
 * 時間帯の近さスコア（0〜1）。
 * 現在の時間帯周辺（±2時間）での出現頻度に基づく。
 */
function timeScore(currentHour: number, hourCounts: number[], totalCount: number): number {
  if (totalCount === 0) return 0;

  // 現在時刻の前後2時間の出現回数を加重合計
  let weightedSum = 0;
  const weights = [0.2, 0.6, 1.0, 0.6, 0.2]; // -2h, -1h, 0h, +1h, +2h
  for (let i = 0; i < 5; i++) {
    const h = (currentHour - 2 + i + 24) % 24;
    weightedSum += hourCounts[h] * weights[i];
  }

  // 全時間帯に均等に分布した場合を基準に正規化
  const uniformExpected = (totalCount / 24) * (0.2 + 0.6 + 1.0 + 0.6 + 0.2);
  if (uniformExpected === 0) return 0;

  // 均等分布との比率（上限1.0）
  return Math.min(weightedSum / uniformExpected / 2, 1.0);
}

/**
 * 頻度スコア（0〜1）。対数スケールで正規化。
 */
function frequencyScore(count: number, maxCount: number): number {
  if (maxCount <= 1) return count > 0 ? 1 : 0;
  return Math.log(1 + count) / Math.log(1 + maxCount);
}

/**
 * メモのサジェスト候補を返すhook。
 *
 * - ダイアログが開かれたときに過去データの集計を1回実行しキャッシュ
 * - 金額入力・時刻に基づいてスコアリング（O(ユニークメモ数)）
 */
export function useMemoSuggestions(
  active: boolean,
  inputAmount: number,
  maxResults: number = 5,
): MemoSuggestion[] {
  const [statsMap, setStatsMap] = useState<Map<string, MemoStats>>(new Map());

  // ダイアログが開かれたときに統計を構築
  useEffect(() => {
    if (!active) return;
    buildMemoStatsMap().then(setStatsMap);
  }, [active]);

  const currentHour = new Date().getHours();

  // 入力金額と時刻に基づいてスコアリング
  const suggestions = useMemo(() => {
    if (statsMap.size === 0) return [];

    // 最大頻度を取得（頻度スコアの正規化用）
    let maxCount = 0;
    for (const stats of statsMap.values()) {
      if (stats.totalCount > maxCount) maxCount = stats.totalCount;
    }

    const scored: MemoSuggestion[] = [];

    for (const stats of statsMap.values()) {
      const aScore = inputAmount > 0 ? amountScore(inputAmount, stats.amounts) : 0;
      const tScore = timeScore(currentHour, stats.hourCounts, stats.totalCount);
      const fScore = frequencyScore(stats.totalCount, maxCount);

      // 重み付き合計スコア
      // 金額が入力されている場合: 金額0.4 + 時間帯0.3 + 頻度0.3
      // 金額未入力の場合: 時間帯0.5 + 頻度0.5
      const score =
        inputAmount > 0
          ? aScore * 0.4 + tScore * 0.3 + fScore * 0.3
          : tScore * 0.5 + fScore * 0.5;

      scored.push({ memo: stats.memo, score, topCategory: stats.topCategory });
    }

    // スコア降順でソートし上位N件を返す
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }, [statsMap, inputAmount, currentHour, maxResults]);

  return suggestions;
}
