import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { formatCurrency } from '../../utils/format';
import { calcMonthBudgetStatus } from '../../utils/budget';

interface MonthBudgetPanelProps {
  budget: number | null; // 月予算（未設定ならnull）
  variableSpent: number; // 変動費合計（特別な支出も含む）
  fixedCostTotal: number; // 固定費合計
  daysElapsed: number; // 経過日数
  daysInMonth: number; // 月の日数
  isCurrentMonth: boolean; // 表示中の月が今月かどうか
  plannedRemaining?: number; // 今日以降に使う予定の合計（未消化分）
  onEditBudget: () => void; // 予算編集ボタンクリック時
}

// カレンダービュー用の月予算パネル（コンパクト表示）
// 合計（固定費+変動費）と内訳、予算残額を表示し、
// 今のペースで予算を超えそうな場合はバーが警告色になる
export function MonthBudgetPanel({
  budget,
  variableSpent,
  fixedCostTotal,
  daysElapsed,
  daysInMonth,
  isCurrentMonth,
  plannedRemaining = 0,
  onEditBudget,
}: MonthBudgetPanelProps) {
  const totalSpent = variableSpent + fixedCostTotal;
  const breakdownText = `変動 ${formatCurrency(variableSpent)}・固定 ${formatCurrency(fixedCostTotal)}`;

  if (budget === null) {
    return (
      <Paper
        variant="outlined"
        sx={{ px: 1.5, py: 0.75 }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              合計
            </Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {formatCurrency(totalSpent)}
            </Typography>
          </Box>
          <Button size="small" onClick={onEditBudget}>
            予算を設定
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {breakdownText}
        </Typography>
      </Paper>
    );
  }

  const status = calcMonthBudgetStatus({
    budget,
    variableSpent,
    fixedCostTotal,
    daysElapsed,
    daysInMonth,
    isCurrentMonth,
  });

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1.5,
        py: 1,
        ...(status.isOver && { borderColor: 'error.main' }),
      }}
    >
      {/* 合計 + 残額（or 超過額）+ 編集ボタンを1行に */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              合計
            </Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {formatCurrency(totalSpent)}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="caption"
              color={status.isOver ? 'error.main' : 'text.secondary'}
            >
              {status.isOver ? '予算超過' : '予算まであと'}
            </Typography>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                lineHeight: 1.2,
                color: status.isOver ? 'error.main' : 'success.main',
              }}
            >
              {formatCurrency(Math.abs(status.remaining))}
            </Typography>
          </Box>
        </Box>
        <Tooltip title="この月の予算を変更">
          <IconButton
            size="small"
            onClick={onEditBudget}
            aria-label="月予算を編集"
            sx={{ my: -0.5 }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 変動費・固定費の内訳 */}
      <Typography variant="caption" color="text.secondary">
        {breakdownText}
      </Typography>

      {/* 予定を差し引いた自由に使えるお金（予定が入っている月のみ） */}
      {plannedRemaining > 0 && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            color: status.remaining - plannedRemaining < 0 ? 'error.main' : 'success.main',
          }}
        >
          予定 {formatCurrency(plannedRemaining)} を除くと:{' '}
          {formatCurrency(status.remaining - plannedRemaining)}
        </Typography>
      )}

      {/* 消化状況バー（超えそうなペースなら警告色、超過なら赤） */}
      <LinearProgress
        variant="determinate"
        value={status.progress}
        color={status.isOver ? 'error' : status.willExceed ? 'warning' : 'primary'}
        sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
      />

      {/* 日割り目安と月予算を1行に */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary">
          {isCurrentMonth && !status.isOver && status.dailyAllowance !== null
            ? `残り${status.remainingDays}日・1日 ${formatCurrency(status.dailyAllowance)}`
            : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          月予算 {formatCurrency(budget)}
        </Typography>
      </Box>
    </Paper>
  );
}
