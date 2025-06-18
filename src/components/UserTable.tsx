import * as React from 'react';
import { useEffect, useState } from 'react';
import { USER } from '../types/types';
import BalanzAPI from '../services/balanz_api';
import { DataGrid, GridColDef, GridRowId, GridRowModel, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

interface UserTableProps {
  api: BalanzAPI;
};

const BLANKUSER: USER = { 
  user_id: '(new user)',
  user_type: 'Status',
  description: ''
};

const UserTable: React.FC<UserTableProps> = ({api}) => {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [userData, setUserData] = useState<Array<USER>>([]);

  const snack = (message: string) => {
    setMessage(message);
    setOpen(true);
  };

  const handleClose = () => {setOpen(false)};

  // Get tags
  useEffect(() => {
    const getUsers = async() => {
      const [ok, payload] = await api.call("GetUsers", {});
      if (ok == 3) {
        console.log("Succesfully retrieved users, #", payload.length);
        setUserData([BLANKUSER, ...payload]);
      } else {
        console.log("Error getting users")
        snack("Error getting users");
      }
    }
    getUsers();
  }, 
  [api]);

  const processRowUpdate = React.useCallback(
    async (updatedRow: GridRowModel, originalRow: GridRowModel) => {
      const payload = {"user_id": updatedRow.user_id}
      for (const [key, value] of Object.entries(updatedRow)) {
        if ((key == "password" && value != "(hidden)") || (key != "password" && value != originalRow[key])) {
          // @ts-expect-error Much easier this way
          payload[key] = value;
        }
      }
  
      if (updatedRow["user_id"] == BLANKUSER.user_id) {
        snack("User ID must be set first")
        return originalRow;
      }
  
      if (originalRow["user_id"] == BLANKUSER.user_id) {
        const [ok,] = await api.call("CreateUser", payload);
        if (ok == 3) {
          snack("Succesfully created user");
          return updatedRow;
        } else {
          snack("Error creating user");
          return originalRow;
        }
      } else {
        const [ok,] = await api.call("UpdateUser", payload);
        if (ok == 3) {
          snack("Succesfully updated user");
          return updatedRow;
        } else {
          snack("Error updating user");
          return originalRow;
        }
      }
    }, [api]
  );

  async function delete_user(user_id: string) {
    const [ok,] = await api.call("DeleteUser", {"user_id": user_id});
    if (ok == 3) {
      setUserData(userData.filter((user) => user.user_id != user_id));
      snack("Succesfully deleted user");
    } else {
      snack("Error deleting user");
    }
  }

  const columns: GridColDef<(typeof userData)[number]>[] = [
    { field: 'user_id', headerName: 'ID', flex: 2, editable: true },
    { field: 'user_type', headerName: 'User Type', flex: 2, type: 'singleSelect',
      valueOptions: ['Status', 'Analysis', 'SessionPriority', 'Tags', 'Admin'], editable: true, 
    },
    { field: 'description', headerName: 'Description', flex: 4, editable: true},
    { field: 'password', headerName: 'Password', flex: 4, editable: true, valueGetter: (_) => "(hidden)"},
    { field: 'delete', headerName: '', flex: 1,
        renderCell: (params) => {
          if (params.row.user_id == BLANKUSER.user_id)
            return <div></div>
          else
            return <Button onClick={() => {delete_user(params.row.user_id)}}><DeleteIcon color="error"/></Button>
        },
     },      
  ];

  function getRowId(user: GridRowModel): GridRowId {
    return user.user_id;
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
      <DataGrid
        editMode="row"
        getRowId={getRowId}
        rows={userData}
        density="compact"
        slots={{ toolbar: CustomToolbar }}
        showToolbar
        // @ts-expect-error Much easier this way
        columns={columns}
        sx={{fontSize: '.8rem'}}
        processRowUpdate={processRowUpdate}
        isCellEditable={(params: GridRowModel) => (params.field != 'user_id' && params.field != 'delete') || (params.field == 'user_id' && params.value == BLANKUSER.user_id) }
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

export default UserTable;


