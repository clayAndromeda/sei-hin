import {
  Alert,
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
  onEditBudget: () => void; // 予算編集ボタンクリック時
}

// カレンダービュー用の月予算パネル
// 予算残額を大きく表示し、今のペースで予算を超えそうな場合は警告を出す
export function MonthBudgetPanel({
  budget,
  variableSpent,
  fixedCostTotal,
  daysElapsed,
  daysInMonth,
  isCurrentMonth,
  onEditBudget,
}: MonthBudgetPanelProps) {
  if (budget === null) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          月予算が未設定です
        </Typography>
        <Button size="small" variant="outlined" onClick={onEditBudget}>
          月予算を設定する
        </Button>
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
        p: 1.5,
        ...(status.isOver && { borderColor: 'error.main' }),
      }}
    >
      {/* 予算残額（メイン表示） */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {status.isOver ? '予算超過' : '予算まであと'}
          </Typography>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              lineHeight: 1.2,
              color: status.isOver ? 'error.main' : 'success.main',
            }}
          >
            {formatCurrency(Math.abs(status.remaining))}
          </Typography>
        </Box>
        <Tooltip title="この月の予算を変更">
          <IconButton size="small" onClick={onEditBudget} aria-label="月予算を編集">
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 消化状況バー */}
      <LinearProgress
        variant="determinate"
        value={status.progress}
        color={status.isOver ? 'error' : status.willExceed ? 'warning' : 'primary'}
        sx={{ height: 8, borderRadius: 4, mt: 1 }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          支出 {formatCurrency(status.spent)}（固定費 {formatCurrency(fixedCostTotal)} 含む）
        </Typography>
        <Typography variant="caption" color="text.secondary">
          月予算 {formatCurrency(budget)}
        </Typography>
      </Box>

      {/* 残り日数の目安（当月のみ） */}
      {isCurrentMonth && !status.isOver && status.dailyAllowance !== null && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          残り{status.remainingDays}日・1日あたり {formatCurrency(status.dailyAllowance)} 使えます
        </Typography>
      )}

      {/* 予算超過・超過予測の警告（当月のみ予測を表示） */}
      {status.isOver ? (
        <Alert severity="error" sx={{ mt: 1, py: 0.25 }}>
          予算を {formatCurrency(Math.abs(status.remaining))} 超過しています
        </Alert>
      ) : (
        status.willExceed &&
        status.projectedTotal !== null && (
          <Alert severity="warning" sx={{ mt: 1, py: 0.25 }}>
            このペースだと月末に約 {formatCurrency(status.projectedTotal)} となり、
            予算を {formatCurrency(status.projectedTotal - budget)} 超えそうです
          </Alert>
        )
      )}
    </Paper>
  );
}
