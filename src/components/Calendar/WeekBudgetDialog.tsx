import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { getWeekRange } from '../../utils/date';
import { useWeekBudget, setWeekBudget, deleteWeekBudget } from '../../hooks/useWeekBudget';
import { formatCurrency } from '../../utils/format';

interface WeekBudgetDialogProps {
  open: boolean;
  weekStart: string; // 週開始日（YYYY-MM-DD）
  onClose: () => void;
  onDataChanged?: () => void;
}

export function WeekBudgetDialog({ open, weekStart, onClose, onDataChanged }: WeekBudgetDialogProps) {
  const currentBudget = useWeekBudget(weekStart);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // ダイアログが開いたら現在の予算値を入力フィールドに設定
  useEffect(() => {
    if (open && currentBudget !== null) {
      setBudgetInput(String(currentBudget));
    } else if (open) {
      setBudgetInput('');
    }
  }, [open, currentBudget]);

  const handleSave = async () => {
    const value = parseInt(budgetInput, 10);
    if (isNaN(value) || value < 0) {
      setError('正の整数を入力してください');
      return;
    }
    try {
      setError(null);
      await setWeekBudget(weekStart, value);
      onDataChanged?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  const handleResetToDefault = async () => {
    try {
      setError(null);
      await deleteWeekBudget(weekStart);
      onDataChanged?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  // 週範囲を表示用に整形（M/D 〜 M/D）
  const getWeekRangeText = () => {
    if (!weekStart) return '';
    const startDate = new Date(weekStart);
    const { end } = getWeekRange(startDate);
    const startText = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
    const endText = `${end.getMonth() + 1}/${end.getDate()}`;
    return `${startText} 〜 ${endText}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>週予算設定</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          週範囲: {getWeekRangeText()}
        </Typography>
        {currentBudget !== null && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            現在の予算: {formatCurrency(currentBudget)}
          </Typography>
        )}
        <TextField
          fullWidth
          label="週予算（円）"
          type="number"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          autoFocus
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleResetToDefault} color="secondary">
          デフォルトに戻す
        </Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
