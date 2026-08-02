import { Box, Typography } from '@mui/material';

export interface ChartReadoutItem {
  color: string;
  label: string;
  value: string;
}

interface ChartReadoutProps {
  title: string;
  total?: string; // 右端に表示する合計（省略可）
  items: ChartReadoutItem[];
}

// 選択したバーの内訳をグラフ直下に表示する固定領域。
// オーバーレイではないため他のグラフを覆い隠さない。
export function ChartReadout({ title, total, items }: ChartReadoutProps) {
  return (
    <Box
      sx={{
        mx: 2,
        mb: 1,
        px: 1.5,
        py: 0.75,
        backgroundColor: 'action.hover',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="subtitle2">{title}</Typography>
        {total && (
          <Typography variant="subtitle2" fontWeight="bold">
            {total}
          </Typography>
        )}
      </Box>
      {items.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.25, mt: 0.25 }}>
          {items.map((item) => (
            <Box
              key={item.label}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
