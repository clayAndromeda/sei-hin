import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box,
} from '@mui/material';
import type { FixedCostItem } from '../../types';
import {
  addFixedCostItem,
  clearAmountChange,
  endFixedCostItem,
  renameFixedCostItem,
  setAmountForMonth,
  useFixedCostAmountChanges,
} from '../../hooks/useFixedCosts';
import {
  formatYearMonthLabel,
  resolveAmountForMonth,
} from '../../utils/fixedCost';
import { formatCurrency } from '../../utils/format';

type DialogMode = 'add' | 'edit';

interface FixedCostItemDialogProps {
  open: boolean;
  mode: DialogMode;
  item: FixedCostItem | null; // mode === 'edit' のとき必須
  yearMonth: string; // "YYYY-MM"
  onClose: () => void;
}

export function FixedCostItemDialog({
  open,
  mode,
  item,
  yearMonth,
  onClose,
}: FixedCostItemDialogProps) {
  const changes = useFixedCostAmountChanges();
  const [nameInput, setNameInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // edit モード時の現在金額と発効月
  const resolved =
    mode === 'edit' && item
      ? resolveAmountForMonth(item, changes, yearMonth)
      : null;

  // この月に紐づく変更レコードが存在するか（「この月の変更を取り消す」ボタン表示判定）
  const hasChangeForThisMonth =
    mode === 'edit' && item
      ? changes.some(
          (c) =>
            c.itemId === item.id &&
            c.effectiveYearMonth === yearMonth &&
            !c.deleted,
        )
      : false;

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && item && resolved) {
      setNameInput(item.name);
      setAmountInput(String(resolved.amount));
    } else {
      setNameInput('');
      setAmountInput('');
    }
    setError(null);
    // open, mode, item.id のみ依存。resolved は毎回変わるので除外。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, item?.id]);

  const handleSave = async () => {
    const name = nameInput.trim();
    const amount = parseInt(amountInput, 10);
    if (!name) {
      setError('項目名を入力してください');
      return;
    }
    if (isNaN(amount) || amount < 0) {
      setError('金額は0以上の整数を入力してください');
      return;
    }

    try {
      setError(null);
      if (mode === 'add') {
        await addFixedCostItem(name, amount, yearMonth);
      } else if (mode === 'edit' && item) {
        if (name !== item.name) {
          await renameFixedCostItem(item.id, name);
        }
        if (resolved && amount !== resolved.amount) {
          await setAmountForMonth(item.id, yearMonth, amount);
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !item) return;
    const msg =
      item.startYearMonth === yearMonth
        ? `「${item.name}」を削除しますか？\n（過去月のデータがないため完全に消えます）`
        : `「${item.name}」を${formatYearMonthLabel(yearMonth)}以降から削除しますか？\n（${formatYearMonthLabel(yearMonth)}より前の月には残ります）`;
    if (!window.confirm(msg)) return;
    try {
      setError(null);
      await endFixedCostItem(item.id, yearMonth);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };


  const handleClearChange = async () => {
    if (mode !== 'edit' || !item) return;
    try {
      setError(null);
      await clearAmountChange(item.id, yearMonth);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取り消しに失敗しました');
    }
  };

  const title = mode === 'add' ? '固定費を追加' : `${item?.name ?? ''} を編集`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          対象月: {formatYearMonthLabel(yearMonth)}
        </Typography>

        {mode === 'edit' && resolved && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            現在: {formatCurrency(resolved.amount)}（
            {resolved.changedFrom
              ? `${formatYearMonthLabel(resolved.changedFrom)}以降の金額`
              : '初期金額'}
            ）
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            label="項目名"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus={mode === 'add'}
          />
          <TextField
            fullWidth
            label="金額（円）"
            type="number"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            inputProps={{ min: 0, step: 1 }}
          />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 1 }}
        >
          {mode === 'add'
            ? `${formatYearMonthLabel(yearMonth)}以降のすべての月に表示されます。`
            : `金額変更は${formatYearMonthLabel(yearMonth)}以降に適用されます（次の変更があればそこで上書き）。`}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
        {mode === 'edit' && (
          <Button onClick={handleDelete} color="error">
            削除
          </Button>
        )}
        {hasChangeForThisMonth && (
          <Button onClick={handleClearChange} color="secondary">
            この月の変更を取り消す
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
