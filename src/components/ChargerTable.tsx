import * as React from 'react';
import { CHARGER } from '../types/types';
import { useEffect, useState } from 'react';
import BalanzAPI from '../services/balanz_api';
import { DataGrid, GridColDef, GridRowId, GridRowModel, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import ResetCharger from './ResetCharger';
import ResetChargerAuthKey from './ResetChargerAuthKey';
import DeleteCharger from './DeleteCharger';
import CableIcon from '@mui/icons-material/Cable';
import FirmwareUpgradeCharger from './FirmwareUpgradeCharger';


interface ChargerTableProps {
  api: BalanzAPI;
  userType: string;
};

const BLANKCHARGER: CHARGER = { 
  charger_id: '(new charger)',
  alias: '(new alias)',
  group_id: '(new group)',
  description: '(new description)',
  priority: 3,
  connectors: new Map(),
  network_connected: false,
  charge_box_serial_number: '',
  charge_point_model: '',
  charge_point_vendor: '',
  conn_max: 16,
  firmware_version: '',
  meter_type: '',
  fw_options: []
};

const ChargerTable: React.FC<ChargerTableProps> = ({api, userType}) => {
  const [chargerData, setChargerData] = useState<Array<CHARGER>>([]);
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const snack = (message: string) => {
    setMessage(message);
    setOpen(true);
  };

  const handleClose = () => {setOpen(false)};

  const processRowUpdate = React.useCallback(
    async (updatedRow: GridRowModel, originalRow: GridRowModel) => {
      const payload = {"charger_id": updatedRow.charger_id}

      for (const [key, value] of Object.entries(updatedRow)) {
          if (value != originalRow[key]) {
          // @ts-expect-error Much easier this way
          payload[key] = value;
        }
      }

      if (updatedRow["id_tag"] == BLANKCHARGER.charger_id) {
        snack("New Charger ID must be set first")
        return originalRow;
      }

      if (originalRow["charger_id"] == BLANKCHARGER.charger_id) {
        const [ok,] = await api.call("CreateCharger", payload);
        if (ok == 3) {
          snack("Succesfully created charger");
          return updatedRow;
        } else {
          snack("Error creating charger");
          return originalRow;
        }
      } else {
        const [ok,] = await api.call("UpdateCharger", payload);
        if (ok == 3) {
          snack("Succesfully updated charger");
          return updatedRow;
        } else {
          console.log("Error updating charger");
          snack("Error updating group");
          return originalRow;
        }
      }
    }, [api]
  );

  // Get chargers
  useEffect(() => {
    const getChargers = async() => {
      const [ok, payload] = await api.call("GetChargers", {});
      if (ok == 3) {
        setChargerData([BLANKCHARGER, ... payload]);
      } else {
        console.log("Error getting chargers");
      }
    }

    getChargers();
    
    const interval = setInterval(() => {
      getChargers();
     }, 10000);

    return() => clearInterval(interval)    
  }, 
  [api]);


  const columns: GridColDef<(typeof chargerData)[number]>[] = [
    { field: 'charger_id', headerName: 'ID', flex: 2, editable: true },
    { field: 'alias', headerName: 'Alias', flex: 1, editable: true },
    { field: 'group_id', headerName: 'Group', flex: 1, editable: true },
    { field: 'description', headerName: 'Description', flex: 2, editable: true},
    { field: 'priority', headerName: 'Priority', type: 'number', flex: 1, editable: true},
    { field: 'conn_max', headerName: 'Max A', type: 'number', flex: .7, editable: true},
    { field: 'firmware_version', headerName: 'Firmware Version', flex: 3},
    { field: 'charge_point_vendor', headerName: 'Vendor', flex: 1},
    { field: 'charge_point_model', headerName: 'Model', flex: 3},
    { field: 'meter_type', headerName: 'Type', flex: .5},
    { field: 'no_connectors', headerName: '# Connectors', flex: 1, type: 'number', valueGetter: (_, charger) => {
        return Object.keys(charger["connectors"]).length;
      }
    },
    { field: 'network_connected', 
      headerName: 'Conn',
      description: 'Network Connection Status',
      disableColumnMenu: true,
      hideSortIcons: true,
      renderCell: (params) => {
        if (params.row.charger_id == BLANKCHARGER.charger_id)
          return <div></div>
        else {
          if (params.row.network_connected)
            return (<CableIcon sx={{mt: .5}} color="success" />);
          else
            return (<CableIcon sx={{mt: .5}} color="warning" />);
        }
      }, flex: .3,
    },
    { field: 'reset', 
      headerName: 'Reset',
      description: 'Reset Charger',
      sortable: false,
      disableColumnMenu: true,
      hideSortIcons: true,
      disableExport: true,
      renderCell: (params) => {
        if (userType == 'Admin' && params.row.network_connected)
          return (
            <ResetCharger 
              api={api} 
              charger_id={params.row.charger_id} 
              charger_alias={params.row.alias} 
              snack={snack}
            />
          );
        else 
          return (<></>);
      }, flex: .7
    },
    { field: 'update', 
      headerName: 'Update',
      description: 'Update Charger Firmware',
      sortable: false,
      disableColumnMenu: true,
      hideSortIcons: true,
      disableExport: true,
      renderCell: (params) => {
        if (userType == 'Admin' && params.row.network_connected && params.row.fw_options.length > 0)
          return (
            <FirmwareUpgradeCharger 
              api={api} 
              charger_id={params.row.charger_id} 
              charger_alias={params.row.alias} 
              snack={snack}
              fw_options={params.row.fw_options}
            />
          );
        else 
          return (<></>);
      }, flex: .7
    },
    { field: 'delete', 
      headerName: 'Delete', 
      description: 'Delete Charger', 
      flex: .7,
      sortable: false,
      disableColumnMenu: true, 
      hideSortIcons: true,
      disableExport: true,
        renderCell: (params) => {
          if (params.row.charger_id == BLANKCHARGER.charger_id)
            return <div></div>
          else
            return <DeleteCharger api={api} charger_id={params.row.charger_id} charger_alias={params.row.alias} snack={snack}/>;
        }
    },
    { field: 'authreset', 
      headerName: 'Auth Reset',
      description: 'Reset AuthorizationKey',
      sortable: false,
      disableColumnMenu: true,
      hideSortIcons: true,
      disableExport: true,
      renderCell: (params) => {
        if (userType == 'Admin')
          return (
            <ResetChargerAuthKey 
              api={api} 
              charger_id={params.row.charger_id} 
              charger_alias={params.row.alias} 
              snack={snack}
            />
          );
        else 
          return (<></>);
      }, flex: .7
    },
  ];

  function getRowId(charger: GridRowModel): GridRowId {
    return charger.charger_id;
  };

  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <Box sx={{ flexGrow: 1 }} />
        <GridToolbarExport/>
      </GridToolbarContainer>
    );
  }
    
    return (
    <Stack>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          editMode="row"
          getRowId={getRowId}
          rows={chargerData}
          density="compact"
          slots={{ toolbar: CustomToolbar }}
          // @ts-expect-error Much easier this way
          columns={columns}
          sx={{fontSize: '.8rem'}}
          processRowUpdate={processRowUpdate}
          isCellEditable={(params: GridRowModel) => (params.field != 'charger_id' && params.field != 'delete') || (params.field == 'charger_id' && params.value == BLANKCHARGER.charger_id) }
        />
      </div>
        <Snackbar
          open={open}
          autoHideDuration={4000}
          onClose={handleClose}
          message={message}
        />  
    </Stack>
  );
};

export default ChargerTable;
