import type { ReactNode } from 'react';
import {
  Paper,
  ListItemButton,
  Typography,
  Collapse,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { usePersistedState } from '../../hooks/usePersistedState';

interface SectionCardProps {
  title: string;
  // 折りたたみ時にも見える要約（合計金額・件数など）
  summary?: ReactNode;
  // 開閉状態の永続化キー（localStorage）
  storageKey: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

// サマリー画面のセクションを表す折りたたみ可能なカード。
// 開閉状態はlocalStorageに永続化され、次回表示時も維持される。
export function SectionCard({
  title,
  summary,
  storageKey,
  defaultOpen = false,
  children,
}: SectionCardProps) {
  const [open, setOpen] = usePersistedState(storageKey, defaultOpen);

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <ListItemButton
        onClick={() => setOpen(!open)}
        sx={{ py: 1.25, px: 2, gap: 1 }}
      >
        <Typography variant="subtitle2" sx={{ flexGrow: 1, whiteSpace: 'nowrap' }}>
          {title}
        </Typography>
        {summary && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'right', minWidth: 0 }}
          >
            {summary}
          </Typography>
        )}
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: 'text.secondary',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </ListItemButton>
      <Collapse in={open}>
        <Divider />
        {children}
      </Collapse>
    </Paper>
  );
}
