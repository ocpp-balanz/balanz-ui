import { useEffect, useState } from "react";
import { CHARGING_ENTRY, SESSION, CHARGER } from "../types/types";
import {
  DataGrid,
  GridColDef,
  GridRowModel,
  GridRowId,
  GridToolbarContainer,
  GridToolbarExport,
} from "@mui/x-data-grid";
import ChargingHistory from "./ChargingHistory";
import { format_time } from "../common/utils";
import { Button, Stack, Box } from "@mui/material";
import BalanzAPI from "../services/balanz_api";
import { augment_session_data } from "../common/SessionSupport";
import { price_session_data, price_currency, tariff_tooltip, spot_tooltip } from "../common/EPricing";

const TARIFF_HEADER = "Tariff (" + price_currency() + ")";
const SPOT_HEADER = "Spot (" + price_currency() + ")";
const PRICE_HEADER = "Price (" + price_currency() + ")";

interface SessionTableProps {
  api: BalanzAPI;
  sessionData: Array<SESSION>;
  chargerData: Array<CHARGER>;
}

const SessionTable: React.FC<SessionTableProps> = ({
  api,
  sessionData,
  chargerData,
}) => {
  const [sessionAugmented, setSessionAugmented] = useState<boolean>(false);

  function get_history_data(
    history: Array<CHARGING_ENTRY>,
  ): Array<CHARGING_ENTRY> {
    history.map((e) => {
      e.date = new Date(e.timestamp * 1000);
    });
    return history;
  }

  // Initial augmentation of sessionData. For each historic CHARGING_ENTRY element,
  // a net Wh usage value will be added.
  useEffect(() => {
    augment_session_data(sessionData);
    price_session_data(sessionData, chargerData);
    setSessionAugmented(true);
  }, [sessionData, sessionAugmented]);

  function download_sessions() {
    const getSessionsCSV = async () => {
      const [ok, payload] = await api.call("GetCSVSessions", {});
      if (ok == 3) {
        const blob = new Blob([payload], { type: "text/csv" });

        // Create a temporary link element
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sesssions.csv"; // File name

        // Trigger download and clean up
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.log("Error getting session CSV file");
      }
    };
    getSessionsCSV();
  }

  function getRowId(session: GridRowModel): GridRowId {
    return session.session_id;
  }

  const columns: GridColDef<(typeof sessionData)[number]>[] = [
    { field: "session_id", headerName: "ID", flex: 3 },
    { field: "charger_id", headerName: "Charger", flex: 2 },
    { field: "charger_alias", headerName: "Alias", flex: 1 },
    { field: "group_id", headerName: "Group", flex: 1 },
    { field: "id_tag", headerName: "Tag", flex: 2 },
    { field: "user_name", headerName: "User", flex: 2 },
    { field: "stop_id_tag", headerName: "Stop Tag", flex: 2 },
    {
      field: "start_time",
      headerName: "Start Time",
      flex: 2,
      valueGetter: (value) => format_time(value),
    },
    {
      field: "end_time",
      headerName: "End Time",
      flex: 2,
      valueGetter: (value) => format_time(value),
    },
    {
      field: "energy_meter",
      headerName: "Energy (kWh)",
      flex: 1,
      type: "number",
      valueGetter: (value) => {
        return (value / 1000).toFixed(3);
      },
    },
    {
      field: "tariff_price",
      headerName: TARIFF_HEADER,
      description: tariff_tooltip(),
      flex: 1,
      type: "number",
      valueGetter: (value: number) => {
        return value.toFixed(2);
      },
      disableColumnMenu: true,
      hideSortIcons: true,
    },
    {
      field: "spot_price",
      headerName: SPOT_HEADER,
      description: spot_tooltip(),
      flex: 1,
      type: "number",
      valueGetter: (value: number) => {
        return value.toFixed(2);
      },
      disableColumnMenu: true,
      hideSortIcons: true,
    },
    {
      field: "price",
      headerName: PRICE_HEADER,
      flex: 1,
      type: "number",
      valueGetter: (value: number) => {
        return value.toFixed(2);
      },
      disableColumnMenu: true,
      hideSortIcons: true,
    },
    {
      field: "avprice",
      headerName: price_currency() + "/kWh",
      flex: 1,
      type: "number",
      valueGetter: (_, row) => {
        if (row.energy_meter == 0) return 0;
        else return ((1000.0 * row.price) / row.energy_meter).toFixed(2);
      },
    },
    { field: "reason", headerName: "Reason", flex: 2 },
    {
      field: "history",
      headerName: "Hist",
      description: "Charging History",
      disableColumnMenu: true,
      hideSortIcons: true,
      disableExport: true,
      renderCell: (params) => {
        const history_data = get_history_data(params.row.charging_history);
        if (history_data.length == 0) return <></>;
        else
          return (
            <ChargingHistory
              headline={
                "Charging History for " +
                params.row.charger_id +
                " (" +
                params.row.charger_alias +
                "). Start: " +
                format_time(params.row.start_time)
              }
              history={history_data}
            />
          );
      },
      flex: 1,
    },
  ];

  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <Box sx={{ flexGrow: 1 }} />
        <GridToolbarExport />
      </GridToolbarContainer>
    );
  }

  return (
    <Stack>
      <Box sx={{ mb: 2 }} display="flex" justifyContent="flex-start">
        <Button onClick={download_sessions} variant="contained">
          Download backend sessions CSV
        </Button>
      </Box>

      <DataGrid
        getRowId={getRowId}
        rows={sessionData}
        columns={columns}
        density="compact"
        sx={{ fontSize: ".8rem", width: "100%" }}
        slots={{ toolbar: CustomToolbar }}
        initialState={{
          sorting: {
            sortModel: [{ field: "start_time", sort: "desc" }],
          },
          columns: {
            columnVisibilityModel: {
              session_id: false,
              stop_id_tag: false,
            },
          },
        }}
      />
    </Stack>
  );
};

export default SessionTable;
