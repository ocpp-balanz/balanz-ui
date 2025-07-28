import { useState, useEffect } from "react";
import DialogTitle from "@mui/material/DialogTitle";
import Dialog from "@mui/material/Dialog";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import { CHARGING_ENTRY } from "../types/types";
import { LineChart } from "@mui/x-charts/LineChart";

export interface ChargingHistoryProp {
  headline: string;
  history: Array<CHARGING_ENTRY>;
}

export default function ChargingHistory(props: ChargingHistoryProp) {
  const [open, setOpen] = useState<boolean>(false);
  const { headline, history } = props;

    // Augment history by summing up wh into kWh
  useEffect(() => {
    let wh_total = 0.0;
    for (let i = 0; i < history.length; i++) {
      history[i].kwh_total = wh_total / 1000.0;
      wh_total += history[i].wh??0;
    }
  }, [history]);

  const openClose = () => {
    setOpen(!open);
  };

  return (
    <>
      <QueryStatsIcon sx={{ mt: 0.5 }} onClick={openClose}></QueryStatsIcon>
      <Dialog open={open} onClick={openClose} maxWidth={false}>
        <DialogTitle>{headline}</DialogTitle>
        <LineChart
          dataset={history}
          xAxis={[
            {
              dataKey: "date",
              scaleType: "utc",
              valueFormatter: (date) =>
                date.toLocaleString([], {
                  hourCycle: "h23",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
            },
          ]}
          yAxis={[
            { id: "currentAxis", label: "A", position: "left", min: 0 },
            { id: "energyAxis", label: "kWh", position: "right", min: 0}
          ]}
          series={[
            {
              yAxisId: "currentAxis",
              dataKey: "offered",
              curve: "stepAfter",
              label: "Charge offered",
              connectNulls: true,
            },
            {
              yAxisId: "currentAxis",
              dataKey: "usage",
              curve: "stepAfter",
              label: "Usage",
              connectNulls: true,
            },
            {
              yAxisId: "energyAxis",
              dataKey: "kwh_total",
              curve: "linear",
              label: "Energy",
            },
          ]}
          height={600}
          width={1000}
        />
      </Dialog>
    </>
  );
}
