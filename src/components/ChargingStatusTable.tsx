import { CHARGER, CHARGING_ENTRY, CONNECTOR, GROUP } from '../types/types';
import { useState, useMemo, useCallback } from 'react';
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Stack from '@mui/material/Stack';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import Divider from '@mui/material/Divider';
import ChargingHistory from './ChargingHistory';
import { format_time } from '../common/utils';
import useMediaQuery from '@mui/material/useMediaQuery';
import BalanzAPI from '../services/balanz_api';
import { useTheme } from "@mui/material/styles";
import CableIcon from '@mui/icons-material/Cable';
import { Gauge } from '@mui/x-charts/Gauge';
import Snackbar from '@mui/material/Snackbar';
import RemoteStop from './RemoteStop';

interface ChargingStatusTableProps {
  group: GROUP;
  chargerData: Array<CHARGER>;
  userType: string;
  api: BalanzAPI;
};

type CONNECTOR_DATA = {
  id: string;
  alias: string;
  connector_id: string;
  charger_id: string;
  status: string;
  priority: number;
  offered: number;
  id_tag: string;
  start_time: string;
  user_name: string;
  usage_meter: number;
  energy_meter: number;
  network_connected: boolean;
};

type CONNECTOR_STATES = Map<string, number>;

const ChargingStatusTable: React.FC<ChargingStatusTableProps> = ({group, chargerData, userType, api}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [connectorData, setConnectorData] = useState<Array<CONNECTOR_DATA>>([]);
  const [connectorStates, setConnectorStates] = useState<CONNECTOR_STATES>(new Map());

  const snack = (message: string) => {
    setMessage(message);
    setOpen(true);
  };

  const handleClose = () => {setOpen(false)};

  function get_max_allocation(group: GROUP): number {
    if (group.max_allocation != null) {
      const max_alloc = group.max_allocation_now;
      let max = 0;
      for (let i = 0; i < max_alloc.length; i++) 
        max = Math.max(max, max_alloc[i][1]);
      return max;
    } else {
      return group.offered;
    }
  }

  function offered_or_usage(group: GROUP): number {
    if (group.max_allocation != null)
      return group.offered;
    else 
      return group.usage;
  }

  function get_history_data(full_id: string): Array<CHARGING_ENTRY> {
    const [charger_id, connector_id] = full_id.split("/");
    const charger = chargerData.find((c) => c.charger_id == charger_id);
    if (charger == undefined)
      return [];
    // @ts-expect-error Much easier this way
    const connector: CONNECTOR = charger?.connectors[connector_id];
    if (connector == undefined)
      return [];
    // @ts-expect-error Much easier this way
    const transaction = connector["transaction"];
    if (transaction == undefined)
      return [];
    const history: Array<CHARGING_ENTRY> = transaction["charging_history"];
    history.map((e) => {
      e.date = new Date(e.timestamp * 1000);
    });
    // Insert a final entry with the same (A) value as the last, but with Now as timestamp
    if (history.length > 0) {
      let last_offered = null;
      let last_usage = null;
      for (let i = history.length - 1; i >= 0; i--)
        if (history[i].offered != null) {
          last_offered = history[i].offered;
          break;
        }
      for (let i = history.length - 1; i >= 0; i--)
        if (history[i].usage != null) {
          last_usage = history[i].usage;
          break;
        }
    
      history.push({timestamp: Date.now() / 1000, date: new Date(), offered: last_offered, usage: last_usage, wh: 0})
    }
    return history;
  }

  const theme = useTheme();
  const fullWidth = useMediaQuery(theme.breakpoints.up("lg"));

    // Do a little manipulation of chargerData to connectionData. Could have been easier perhaps
  // if API had returned directly, but no big deal ...  
  useMemo(() => {
    const result: Array<CONNECTOR_DATA> = [];
    chargerData.map((charger) => {
      for (const [id, connector] of Object.entries(charger.connectors)) {
        const status = connector.status ?? 'Unknown';
        result.push({
          id: charger.charger_id + "/" + id, 
          alias: charger.alias,
          connector_id: id, 
          charger_id: charger.charger_id, 
          status: status,
          priority: connector.priority,
          offered: connector.offered,
          id_tag: connector.transaction != undefined ? connector.transaction.id_tag: null,
          start_time: connector.transaction != undefined ? format_time(connector.transaction.start_time): "",
          user_name: connector.transaction != undefined ? connector.transaction.user_name: null,
          usage_meter: connector.transaction != undefined ? connector.transaction.usage_meter: null,
          energy_meter: connector.transaction != undefined ? connector.transaction.energy_meter: null,
          network_connected: charger.network_connected
        });
      }
    });
    setConnectorData(result);
  }, 
  [chargerData]);

  // Calculate map of connector states
  useMemo(() => {
    const result: CONNECTOR_STATES = new Map();
    connectorData.forEach((connector) => {
      result.set(connector.status, (result.get(connector.status) ?? 0) + 1);
    });
    setConnectorStates(result);
  }, 
  [connectorData]);

  const columns: GridColDef<(typeof connectorData)[number]>[] = [
    { field: 'id', headerName: 'ID', flex: 3},
    { field: 'alias', headerName: 'Alias', flex: 1.4},
    { field: 'status', headerName: 'Status', flex: 2.2, valueGetter: (value) => { return value == 'None'? 'Unknown': value}},
    { field: 'priority', headerName: 'Priority', flex: 1, type: 'number', editable: true },
    { field: 'id_tag', headerName: 'Tag', flex: 2.5},
    { field: 'user_name', headerName: 'User', flex: 2},
    { field: 'start_time', headerName: 'Started', flex: 2.4},
    { field: 'usage_meter', headerName: 'Usage (A)', flex: 1.5, type: 'number', 
      valueFormatter: (value?: number) => {
        if (value == null) {
          return '';
        }
        return value.toFixed(2);
      },
    },
    { field: 'offered', headerName: 'Offer (A)', flex: 1.5, type: 'number' },
    { field: 'energy_meter', headerName: 'Energy (kWh)', flex: 2, type: 'number', valueGetter: (value) => {return (value/1000).toFixed(3)}},
    { field: 'history', 
      headerName: 'Hist',
      description: 'Charging History',
      disableColumnMenu: true,
      hideSortIcons: true,
      renderCell: (params) => {
        const history_data = get_history_data(params.row.id);
        if (history_data.length == 0)
          return (<></>);
        else 
          return (
          <ChargingHistory headline={"Charging History for " + params.row.id + " (" + params.row.alias + "). Start: " + params.row.start_time} 
            history={history_data} />);
      }, flex: .3,
    },
    { field: 'remotestop', 
      headerName: 'Stop',
      description: 'Remotely Stop Charging',
      disableColumnMenu: true,
      hideSortIcons: true,
      renderCell: (params) => {
        if (userType == 'Admin' && ['Charging', 'SuspendedEV', 'SuspendedEVSE'].includes(params.row.status) && params.row.id_tag != null)
          return (
            <RemoteStop 
              api={api} 
              charger_id={params.row.id.split("/")[0]} 
              charger_alias={params.row.alias} 
              connector_id={parseInt(params.row.id.split("/")[1])}
              transaction_id={parseInt(params.row.id.split("/")[1])}
              snack={snack}
            />
          );
        else 
          return (<></>);
       }, flex: .3,
    },
    { field: 'network_connected', 
      headerName: 'Conn',
      description: 'Network Connection Status',
      disableColumnMenu: true,
      hideSortIcons: true,
      renderCell: (params) => {
        if (params.row.network_connected)
          return (<CableIcon sx={{mt: .5}} color="success" />);
        else
          return (<CableIcon sx={{mt: .5}} color="warning" />);
      }, flex: .3,
    }
  ];

  const processRowUpdate = useCallback(
    async (updatedRow: GridRowModel, originalRow: GridRowModel) => {
      console.log(updatedRow);
      const payload = {"charger_id": updatedRow.id.split("/")[0], "connector_id": parseInt(updatedRow.id.split("/")[1])}
      for (const [key, value] of Object.entries(updatedRow)) {
        if (value != originalRow[key]) {
          // @ts-expect-error Much easier this way
          payload[key] = value;
        }
      }
      console.log(payload);
  
      const [ok,] = await api.call("SetChargePriority", payload);
      if (ok == 3) {
        snack("Succesfully updated priority");
        return updatedRow;
      } else {
        snack("Error updating priority");
        return originalRow;
      }
  }, [api]
  );
  
  return (
    <Stack>
      <Accordion key={group.group_id} slotProps={{ transition: { timeout: 0 }}}>
      <AccordionSummary
        expandIcon={<ArrowDropDownIcon />}
        sx={{fontSize: '.9rem', mt: 0}}
      >
        <Stack>
          {group.group_id}
            <Stack alignItems="center" sx={{ width: '100%' }} direction="row" gap={1} divider={<Divider orientation="vertical" />}>
              <Stack alignItems="left" gap={0}>
                <Gauge width={70} height={70} value={offered_or_usage(group)} valueMin={0} valueMax={get_max_allocation(group)} startAngle={-90} endAngle={90}
                  margin={{
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                  }}
                  text={
                    ({ value, valueMax }) => `${value}/${valueMax} A`
                }
                /> 
              </Stack>
              {/* 
              <Stack direction="row" alignItems="center" gap={1} >
                <EvStation color="info" sx={{ scale: '1'}}/> {chargerData.length}
              </Stack> 
              */}
              <Stack sx={{ display: { xs: 'none', md: 'block' }}}>
                <Stack>
                  <Stack direction="row" alignItems="center" gap={1} useFlexGap>
                    <ElectricalServicesIcon color='info' sx={{ scale: '1' }}/> {connectorData.length} 
                  </Stack>
                  Total
                </Stack>
              </Stack>
              <Stack>
                <Stack direction="row" alignItems="center" gap={1}>
                  <ElectricalServicesIcon color='success' sx={{ scale: '1' }}/> {connectorStates.get("Available") ?? 0} 
                </Stack> 
                Available
              </Stack>
              <Stack>
                <Stack direction="row" alignItems="center" gap={1} >
                  <ElectricalServicesIcon color='warning' sx={{ scale: '1' }}/> {connectorStates.get("Charging") ?? 0}
                </Stack> 
                Charging
              </Stack>
              <Stack>
                <Stack direction="row" alignItems="center" gap={1} >
                  <ElectricalServicesIcon color='primary' sx={{ scale: '1' }}/> {connectorStates.get("SuspendedEV") ?? 0} 
                </Stack> 
                SuspendedEV
              </Stack>
              <Stack>
                <Stack direction="row" alignItems="center" gap={1} >
                  <ElectricalServicesIcon color='secondary' sx={{ scale: '1' }}/> {connectorStates.get("SuspendedEVSE") ?? 0}
                </Stack> 
                SuspendedEVSE
              </Stack>
              <Stack sx={{ display: { xs: 'none', md: 'block' }}}>
                <Stack direction="row" alignItems="center" gap={1} >
                  <ElectricalServicesIcon color='success' sx={{ scale: '1' }}/> {connectorStates.get("Preparing") ?? 0} 
                </Stack> 
                Preparing 
              </Stack>
              <Stack sx={{ display: { xs: 'none', md: 'block' }}}>
                <Stack direction="row" alignItems="center" gap={1} >
                  <ElectricalServicesIcon color='success' sx={{ scale: '1' }}/> {connectorStates.get("Finishing") ?? 0} 
                </Stack> 
                Finishing
              </Stack>
              <Stack sx={{ display: { xs: 'none', md: 'block' }}}>
                <Stack direction="row" alignItems="center" gap={1} >
                  <ElectricalServicesIcon color='error' sx={{ scale: '1' }}/> {connectorStates.get("None") ?? 0} 
                </Stack> 
                Unknown
              </Stack>
            </Stack>
          </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{m: 0, px: 0, py: 1, width: '100%'}}>
        <DataGrid 
          hideFooterPagination={true}
          hideFooter={true}
          rows={connectorData}
          // @ts-expect-error Much easier this way
          columns={columns}
          density="compact"
          sx={{fontSize: '.8rem', width: '100%'}}
          isCellEditable={(params) => ['Charging', 'SuspendedEV', 'SuspendedEVSE'].includes(params.row.status) && !(['Status', 'Analysis'].includes(userType))}
          processRowUpdate={processRowUpdate}
          initialState={{
            sorting: {
              sortModel: [{ field: 'alias', sort: 'asc' }],
            },
            columns: {
              columnVisibilityModel: {
                network_connected: fullWidth,
                id: fullWidth,
                id_tag: fullWidth,
                remotestop: (userType == 'Admin')
              },
            },
          }}
        />
      </AccordionDetails>
    </Accordion>
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      message={message}
    />
  </Stack>
  );
};

export default ChargingStatusTable;
