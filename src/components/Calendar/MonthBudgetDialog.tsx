import { useState } from 'react';
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
import {
  useMonthBudget,
  setMonthBudget,
  deleteMonthBudget,
} from '../../hooks/useMonthBudget';
import { formatCurrency } from '../../utils/format';

interface MonthBudgetDialogProps {
  open: boolean;
  yearMonth: string; // "YYYY-MM" 形式
  onClose: () => void;
}

export function MonthBudgetDialog({ open, yearMonth, onClose }: MonthBudgetDialogProps) {
  const currentBudget = useMonthBudget(yearMonth);
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // ダイアログが開いたとき（および開いた直後に予算値がロードされたとき）に
  // 現在の予算値を入力フィールドへ反映する（レンダー中の状態調整パターン）
  const [prevInitKey, setPrevInitKey] = useState<string | null>(null);
  const initKey = open ? `${yearMonth}:${currentBudget ?? ''}` : null;
  if (initKey !== prevInitKey) {
    setPrevInitKey(initKey);
    if (open) {
      setBudgetInput(currentBudget !== null ? String(currentBudget) : '');
      setError(null);
    }
  }

  const handleSave = async () => {
    const value = parseInt(budgetInput, 10);
    if (isNaN(value) || value < 0) {
      setError('正の整数を入力してください');
      return;
    }
    try {
      setError(null);
      await setMonthBudget(yearMonth, value);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  const handleResetToDefault = async () => {
    try {
      setError(null);
      await deleteMonthBudget(yearMonth);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  // "YYYY-MM" を「YYYY年M月」表記に整形
  const getMonthLabel = () => {
    if (!yearMonth) return '';
    const [y, m] = yearMonth.split('-');
    return `${y}年${parseInt(m, 10)}月`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{getMonthLabel()}の月予算設定</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          固定費と変動費を合わせた月全体の予算です。この月だけの予算を設定できます。
        </Typography>
        {currentBudget !== null && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            現在の予算: {formatCurrency(currentBudget)}
          </Typography>
        )}
        <TextField
          fullWidth
          label="月予算（円）"
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
