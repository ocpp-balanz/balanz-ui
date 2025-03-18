import * as React from 'react';
import { CHARGER } from '../types/types';
import { useEffect, useState } from 'react';
import BalanzAPI from '../services/balanz_api';
import { DataGrid, GridColDef, GridRowId, GridRowModel, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import ResetCharger from './ResetCharger';

interface ChargerTableProps {
  api: BalanzAPI;
  userType: string;
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

      const [ok,] = await api.call("UpdateCharger", payload);
      if (ok == 3) {
        snack("Succesfully updated charger");
        return updatedRow;
      } else {
        console.log("Error updating charger");
        snack("Error updating group");
        return originalRow;
      }
    }, [api]
  );

  // Get chargers
  useEffect(() => {
    const getChargers = async() => {
      const [ok, payload] = await api.call("GetChargers", {});
      if (ok == 3) {
        setChargerData(payload);
      } else {
        console.log("Error getting chargers");
      }
    }
    getChargers();
  }, 
  [api]);

  const columns: GridColDef<(typeof chargerData)[number]>[] = [
    { field: 'charger_id', headerName: 'ID', flex: 3 },
    { field: 'alias', headerName: 'Alias', flex: 2 },
    { field: 'group_id', headerName: 'Group', flex: 2},
    { field: 'description', headerName: 'Description', flex: 4, editable: true},
    { field: 'priority', headerName: 'Priority', type: 'number', flex: 1, editable: true},
    { field: 'conn_max', headerName: 'Max A', type: 'number', flex: 1, editable: true},
    { field: 'firmware_version', headerName: 'Firmware version', flex: 3},
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
    }
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
          getRowId={getRowId}
          rows={chargerData}
          density="compact"
          slots={{ toolbar: CustomToolbar }}
          // @ts-expect-error Much easier this way
          columns={columns}
          sx={{fontSize: '.8rem'}}
          processRowUpdate={processRowUpdate}
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
