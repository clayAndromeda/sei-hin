import { Box, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { categoryMapToChartData } from '../../utils/chart';
import { formatCurrency } from '../../utils/format';

interface CategoryDonutChartProps {
  categoryTotals: Map<string, number>;
  total: number;
  height?: number;
}

export function CategoryDonutChart({
  categoryTotals,
  total,
  height = 240,
}: CategoryDonutChartProps) {
  const chartData = categoryMapToChartData(categoryTotals);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', my: 2 }}>
      {/* ドーナツチャート */}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
            <Label
              value={formatCurrency(total)}
              position="center"
              fill="#333"
              style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* カスタム凡例 */}
      <Box sx={{ mt: 2, px: 2 }}>
        {chartData.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: item.color,
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2">{item.label}</Typography>
            </Box>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(item.value)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
