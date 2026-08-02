import { useState } from 'react';

// タップ選択式グラフの選択状態管理。
// フローティングツールチップはタッチで反応が悪く他要素を覆うため、
// タップでバーを選択し、グラフ直下の固定領域（ChartReadout）に内訳を表示する方式にする。
// dataSignatureが変わったら（月切り替え等）選択を解除する（レンダー中の状態調整パターン）。
export function useChartSelection(dataSignature: string) {
  const [selected, setSelected] = useState<number | null>(null);
  const [prevSignature, setPrevSignature] = useState(dataSignature);
  if (prevSignature !== dataSignature) {
    setPrevSignature(dataSignature);
    setSelected(null);
  }

  // Rechartsのチャートクリック（タップ）ハンドラー。
  // バンド上のタップは選択トグル、データ外のタップは選択解除。
  // activeTooltipIndexはrechartsのバージョンにより数値/文字列両方があり得る
  const handleChartClick = (state: unknown) => {
    const raw = (state as { activeTooltipIndex?: number | string } | null)
      ?.activeTooltipIndex;
    const idx = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    if (typeof idx === 'number' && !isNaN(idx) && idx >= 0) {
      setSelected((current) => (current === idx ? null : idx));
    } else {
      setSelected(null);
    }
  };

  return { selected, handleChartClick };
}
