import * as React from 'react';
import { GROUP } from '../types/types';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import BalanzAPI from '../services/balanz_api';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import { DataGrid, GridColDef, GridRowId, GridRowModel, GridToolbarContainer, GridToolbarExport} from '@mui/x-data-grid';
import Button from '@mui/material/Button';

interface GroupTableProps {
  api: BalanzAPI;
};

const GroupTable: React.FC<GroupTableProps> = ({api}) => {
  const [groupData, setGroupData] = useState<Array<GROUP>>([]);
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const snack = (message: string) => {
    setMessage(message);
    setOpen(true);
  };

  const handleClose = () => {setOpen(false)};

  // Get groups
  useEffect(() => {
    const getGroups = async() => {
      const [ok, payload] = await api.call("GetGroups", {});
      if (ok == 3) {
        setGroupData(payload);
      } else {
        console.log("Error getting groups");
      }
    }
    getGroups();
  }, 
  [api]);

  const processRowUpdate = React.useCallback(
    async (updatedRow: GridRowModel, originalRow: GridRowModel) => {
      const payload = {"group_id": updatedRow.group_id}
      for (const [key, value] of Object.entries(updatedRow)) {
        if (value != originalRow[key]) {
          // @ts-expect-error Much easier this way
          payload[key] = value;
        }
      }

      const [ok,] = await api.call("UpdateGroup", payload);
      if (ok == 3) {
        snack("Succesfully updated group");
        return updatedRow;
      } else {
        console.log("Error updating group");
        snack("Error updating group");
        return originalRow;
      }
    }, [api]
  );

  async function persist_groups() {
    const [ok,] = await api.call("WriteGroups", {});
    if (ok == 3) {
      snack("Succesfully persisted groups");
    } else {
      snack("Error persisting groups");
    }
  }

  const columns: GridColDef<(typeof groupData)[number]>[] = [
    { field: 'group_id', headerName: 'ID', flex: 1 },
    { field: 'description', headerName: 'Description', flex: 3, editable: true},
    { field: 'max_allocation', headerName: 'Maximum Allocation', flex: 4, editable: true},
  ];

  function getRowId(group: GridRowModel): GridRowId {
    return group.group_id;
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
      <Box sx={{mb: 2}} display="flex" justifyContent="flex-start">
        <Button color="inherit" onClick={() => {persist_groups()}} variant='contained'>Persist Groups</Button>  
      </Box>
      <DataGrid
        getRowId={getRowId}
        rows={groupData}
        density="compact"
        slots={{ toolbar: CustomToolbar }}
        // @ts-expect-error Much easier this way
        columns={columns}
        sx={{fontSize: '.8rem'}}
        processRowUpdate={processRowUpdate}
      />
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        message={message}
      />  
    </Stack>
  );
};

export default GroupTable;
