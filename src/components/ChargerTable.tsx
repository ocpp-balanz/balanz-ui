import * as React from 'react';
import { CHARGER } from '../types/types';
import { useEffect, useState } from 'react';
import BalanzAPI from '../services/balanz_api';
import { DataGrid, GridColDef, GridRowId, GridRowModel, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import ResetCharger from './ResetCharger';
import DeleteCharger from './DeleteCharger';

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
  firmware_version: ''
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
  }, 
  [api]);

  const columns: GridColDef<(typeof chargerData)[number]>[] = [
    { field: 'charger_id', headerName: 'ID', flex: 3, editable: true },
    { field: 'alias', headerName: 'Alias', flex: 2, editable: true },
    { field: 'group_id', headerName: 'Group', flex: 2, editable: true },
    { field: 'description', headerName: 'Description', flex: 4, editable: true},
    { field: 'priority', headerName: 'Priority', type: 'number', flex: 1, editable: true},
    { field: 'conn_max', headerName: 'Max A', type: 'number', flex: 1, editable: true},
    { field: 'firmware_version', headerName: 'Firmware Version', flex: 3},
    { field: 'charge_point_vendor', headerName: 'Vendor', flex: 2},
    { field: 'charge_point_model', headerName: 'Model', flex: 2},
    { field: 'no_connectors', headerName: '# Connectors', flex: 1, type: 'number', valueGetter: (_, charger) => {
        return Object.keys(charger["connectors"]).length;
      }
    },
    { field: 'reset', 
      headerName: 'Reset',
      description: 'Reset Charger',
      disableColumnMenu: true,
      hideSortIcons: true,
      disableExport: true,
      renderCell: (params) => {
        if (userType == 'Admin')
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
    { field: 'delete', headerName: '', flex: 1,
        renderCell: (params) => {
          if (params.row.charger_id == BLANKCHARGER.charger_id)
            return <div></div>
          else
            return <DeleteCharger api={api} charger_id={params.row.charger_id} charger_alias={params.row.alias} snack={snack}/>;
        }
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
