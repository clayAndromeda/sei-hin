import { useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SyncIcon from '@mui/icons-material/Sync';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { getAuthUrl, disconnect } from '../../services/dropbox';
import { db } from '../../services/db';
import { useDefaultWeekBudget, setDefaultWeekBudget } from '../../hooks/useWeekBudget';
import { formatCurrency } from '../../utils/format';
import type { SeihinData } from '../../types';

interface SettingsViewProps {
  onSync: () => void;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: string | null;
  syncError: string | null;
  connected: boolean;
  onConnectionChange: (connected: boolean) => void;
  onDataChanged?: () => void;
}

export function SettingsView({
  onSync,
  syncStatus,
  lastSyncTime,
  syncError,
  connected,
  onConnectionChange,
  onDataChanged,
}: SettingsViewProps) {
  const [dropboxError, setDropboxError] = useState<string | null>(null);
  const defaultWeekBudget = useDefaultWeekBudget();
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<SeihinData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleDropboxConnect = async () => {
    try {
      setDropboxError(null);
      const url = await getAuthUrl();
      window.location.href = url;
    } catch (error) {
      setDropboxError(
        error instanceof Error ? error.message : 'Dropbox連携エラー',
      );
    }
  };

  const handleDropboxDisconnect = async () => {
    if (window.confirm('Dropbox連携を解除しますか？')) {
      await disconnect();
      onConnectionChange(false);
    }
  };

  const handleSaveWeekBudget = async () => {
    const value = parseInt(budgetInput, 10);
    if (isNaN(value) || value < 0) {
      setBudgetError('正の整数を入力してください');
      return;
    }
    try {
      setBudgetError(null);
      await setDefaultWeekBudget(value);
      onDataChanged?.();
      setBudgetInput('');
    } catch (error) {
      setBudgetError(
        error instanceof Error ? error.message : '保存に失敗しました',
      );
    }
  };

  const handleExport = async () => {
    const expenses = await db.expenses.filter((e) => !e.deleted).toArray();
    const data = {
      version: 2,
      updatedAt: new Date().toISOString(),
      expenses,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seihin-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setImportError(null);
    setImportSuccess(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じファイルを再選択できるよう値をリセット
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as SeihinData;

      // 最低限のバリデーション
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.expenses)) {
        throw new Error('不正なJSON形式: expenses配列が見つかりません');
      }
      setImportPreview(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'JSON解析に失敗しました');
    }
  };

  const handleImportConfirm = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      // bulkPut でIDベースのupsert（既存データは同一IDのみ上書き、それ以外は保持）
      await db.transaction(
        'rw',
        [
          db.expenses,
          db.weekBudgets,
          db.fixedCostItems,
          db.fixedCostAmountChanges,
          db.metadata,
        ],
        async () => {
          if (importPreview.expenses?.length) {
            await db.expenses.bulkPut(importPreview.expenses);
          }
          if (importPreview.weekBudgets?.length) {
            await db.weekBudgets.bulkPut(importPreview.weekBudgets);
          }
          if (importPreview.fixedCostItems?.length) {
            await db.fixedCostItems.bulkPut(importPreview.fixedCostItems);
          }
          if (importPreview.fixedCostAmountChanges?.length) {
            await db.fixedCostAmountChanges.bulkPut(
              importPreview.fixedCostAmountChanges,
            );
          }
          if (importPreview.defaultWeekBudget) {
            await db.metadata.put({
              key: 'defaultWeekBudget',
              value: JSON.stringify(importPreview.defaultWeekBudget),
            });
          }
        },
      );
      const counts = [
        `支出${importPreview.expenses.length}件`,
        importPreview.weekBudgets?.length
          ? `週予算${importPreview.weekBudgets.length}件`
          : null,
        importPreview.fixedCostItems?.length
          ? `固定費項目${importPreview.fixedCostItems.length}件`
          : null,
        importPreview.fixedCostAmountChanges?.length
          ? `金額変更${importPreview.fixedCostAmountChanges.length}件`
          : null,
      ]
        .filter(Boolean)
        .join('・');
      setImportSuccess(`インポート完了: ${counts}`);
      setImportPreview(null);
      onDataChanged?.();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'インポートに失敗しました',
      );
      setImportPreview(null);
    } finally {
      setImporting(false);
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return '未同期';
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 600, mx: 'auto' }}>
      {/* Dropbox連携 */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Dropbox連携
      </Typography>
      <List dense>
        <ListItem>
          <ListItemIcon>
            {connected ? <CloudIcon color="primary" /> : <CloudOffIcon color="disabled" />}
          </ListItemIcon>
          <ListItemText
            primary={connected ? '連携済み' : '未連携'}
          />
        </ListItem>
      </List>
      {connected ? (
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={handleDropboxDisconnect}
          sx={{ mb: 2 }}
        >
          連携解除
        </Button>
      ) : (
        <Button
          variant="contained"
          size="small"
          onClick={handleDropboxConnect}
          sx={{ mb: 2 }}
        >
          Dropboxと連携する
        </Button>
      )}
      {dropboxError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dropboxError}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* 同期 */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        同期
      </Typography>
      <List dense>
        <ListItem>
          <ListItemIcon>
            <SyncIcon color={syncStatus === 'syncing' ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText
            primary={`最終同期: ${formatLastSync(lastSyncTime)}`}
          />
        </ListItem>
      </List>
      <Button
        variant="outlined"
        size="small"
        onClick={onSync}
        disabled={!connected || syncStatus === 'syncing'}
        startIcon={
          syncStatus === 'syncing' ? <CircularProgress size={16} /> : <SyncIcon />
        }
        sx={{ mb: 1 }}
      >
        手動同期
      </Button>
      {syncStatus === 'success' && (
        <Alert severity="success" sx={{ mt: 1 }}>
          同期完了
        </Alert>
      )}
      {syncStatus === 'error' && syncError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {syncError}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* 週予算設定 */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        週予算設定
      </Typography>
      <List dense>
        <ListItem>
          <ListItemText
            primary={`デフォルト週予算: ${defaultWeekBudget !== null ? formatCurrency(defaultWeekBudget) : '未設定'}`}
          />
        </ListItem>
      </List>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          size="small"
          label="週予算（円）"
          type="number"
          value={budgetInput}
          onChange={(e) => setBudgetInput(e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleSaveWeekBudget}
          sx={{ mt: 0.5 }}
        >
          保存
        </Button>
      </Box>
      {budgetError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {budgetError}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* データエクスポート / インポート */}
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        データエクスポート / インポート
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleExport}
          startIcon={<DownloadIcon />}
        >
          JSONエクスポート
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={handleImportClick}
          startIcon={<UploadIcon />}
        >
          JSONインポート
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
      </Box>
      {importError && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setImportError(null)}>
          {importError}
        </Alert>
      )}
      {importSuccess && (
        <Alert severity="success" sx={{ mt: 1 }} onClose={() => setImportSuccess(null)}>
          {importSuccess}
        </Alert>
      )}

      {/* インポート確認ダイアログ */}
      <Dialog
        open={importPreview !== null}
        onClose={() => !importing && setImportPreview(null)}
      >
        <DialogTitle>JSONインポートの確認</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            以下のデータを現在のDBに追加・更新します（同一IDは上書き）。
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              <li>バージョン: v{importPreview?.version ?? '?'}</li>
              <li>支出: {importPreview?.expenses.length ?? 0} 件</li>
              {importPreview?.weekBudgets !== undefined && (
                <li>週予算: {importPreview.weekBudgets.length} 件</li>
              )}
              {importPreview?.fixedCostItems !== undefined && (
                <li>固定費項目: {importPreview.fixedCostItems.length} 件</li>
              )}
              {importPreview?.fixedCostAmountChanges !== undefined && (
                <li>固定費金額変更: {importPreview.fixedCostAmountChanges.length} 件</li>
              )}
              {importPreview?.defaultWeekBudget && (
                <li>デフォルト週予算: あり</li>
              )}
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportPreview(null)} disabled={importing}>
            キャンセル
          </Button>
          <Button
            onClick={handleImportConfirm}
            variant="contained"
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} /> : undefined}
          >
            インポート実行
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
