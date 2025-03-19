import { useState } from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import { CHARGING_ENTRY } from '../types/types';
import { LineChart } from '@mui/x-charts/LineChart';


export interface ChargingHistoryProp {
  headline: string;
  history: Array<CHARGING_ENTRY>;
}

export default function ChargingHistory(props: ChargingHistoryProp) {
  const [open, setOpen] = useState<boolean>(false);
  const { headline, history } = props;

  const openClose = () => {
    setOpen(!open);
  };

  return (<>
    <QueryStatsIcon sx={{mt:.5}} onClick={openClose}></QueryStatsIcon>
    <Dialog open={open} onClick={openClose} maxWidth={false}>
        <DialogTitle>{headline}</DialogTitle>
        <LineChart
          dataset={history}
          xAxis={[
            { dataKey: 'date', 
              scaleType: 'utc',       
              valueFormatter: (date, ) => date.toLocaleString([], {
                hourCycle: 'h23',
                hour: '2-digit',
                minute: '2-digit'
              })
          }]}
          yAxis = {[{ min:0}]}
          series={[
            { dataKey: 'offered', curve: "stepAfter", label: 'Charge offered (A)', connectNulls: true},
            { dataKey: 'usage', curve: "stepAfter", label: 'Usage (A)', connectNulls: true},
          ]}
          height={600}
          width={1000}
        />
    </Dialog>
    </>
  );
}
