import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { WeeklySummary } from './WeeklySummary';
import { MonthlySummary } from './MonthlySummary';

export function SummaryView() {
  const [tab, setTab] = useState(0);

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

      {tab === 0 && <WeeklySummary />}
      {tab === 1 && <MonthlySummary />}
    </Box>
  );
}
