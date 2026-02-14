import { useState } from 'react';
import { Box, Tabs, Tab, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { WeeklySummary } from './WeeklySummary';
import { MonthlySummary } from './MonthlySummary';

export function SummaryView() {
  const [tab, setTab] = useState(0);
  const [includeSpecial, setIncludeSpecial] = useState(true);

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        maxWidth: { md: 900 },
        mx: 'auto',
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
        centered
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        <Tab label="週次" />
        <Tab label="月次" />
      </Tabs>

      {/* 特別な支出フィルタ */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ToggleButtonGroup
          size="small"
          value={includeSpecial}
          exclusive
          onChange={(_, newValue) => newValue !== null && setIncludeSpecial(newValue)}
        >
          <ToggleButton value={true}>特別な支出を含む</ToggleButton>
          <ToggleButton value={false}>特別な支出を除く</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {tab === 0 && <WeeklySummary includeSpecial={includeSpecial} />}
      {tab === 1 && <MonthlySummary includeSpecial={includeSpecial} />}
    </Box>
  );
}
