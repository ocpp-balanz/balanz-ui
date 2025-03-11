import * as React from 'react';
import { useEffect, useState } from 'react';
import { TAG } from '../types/types';
import BalanzAPI from '../services/balanz_api';
import { DataGrid, GridColDef, GridRowId, GridRowModel, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

interface TagTableProps {
  api: BalanzAPI;
};

const BLANKTAG: TAG = { 
  id_tag: '(new tag)',
  user_name: '(new user name)',
  parent_id_tag: null,
  description: null,
  status: 'Activated',
  priority: null
};

const TagTable: React.FC<TagTableProps> = ({api}) => {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [tagData, setTagData] = useState<Array<TAG>>([]);

  const snack = (message: string) => {
    setMessage(message);
    setOpen(true);
  };

  const handleClose = () => {setOpen(false)};

  // Get tags
  useEffect(() => {
    const getTags = async() => {
      const [ok, payload] = await api.call("GetTags", {});
      if (ok == 3) {
        console.log("Succesfully retrieved tags, #", payload.length);
        setTagData([BLANKTAG, ...payload]);
      } else {
        console.log("Error getting tags")
        snack("Error getting tags");
      }
    }
    getTags();
  }, 
  [api]);

  const processRowUpdate = React.useCallback(
    async (updatedRow: GridRowModel, originalRow: GridRowModel) => {
      const payload = {"id_tag": updatedRow.id_tag}
      for (const [key, value] of Object.entries(updatedRow)) {
        if (value != originalRow[key]) {
          // @ts-expect-error Much easier this way
          payload[key] = value;
        }
      }
  
      if (updatedRow["id_tag"] == BLANKTAG.id_tag) {
        snack("New tag ID must be set first")
        return originalRow;
      }
  
      if (originalRow["id_tag"] == BLANKTAG.id_tag) {
        const [ok,] = await api.call("CreateTag", payload);
        if (ok == 3) {
          snack("Succesfully created tag");
          return updatedRow;
        } else {
          snack("Error creating tag");
          return originalRow;
        }
      } else {
        const [ok,] = await api.call("UpdateTag", payload);
        if (ok == 3) {
          snack("Succesfully updated tag");
          return updatedRow;
        } else {
          snack("Error updating tag");
          return originalRow;
        }
      }
    }, [api]
  );

  async function delete_tag(id_tag: string) {
    const [ok,] = await api.call("DeleteTag", {"id_tag": id_tag});
    if (ok == 3) {
      setTagData(tagData.filter((tag) => tag.id_tag != id_tag));
      snack("Succesfully deleted tag");
    } else {
      snack("Error deleting tag");
    }
  }

  const columns: GridColDef<(typeof tagData)[number]>[] = [
    { field: 'id_tag', headerName: 'ID', flex: 2, editable: true },
    { field: 'user_name', headerName: 'User Name', flex: 3, editable: true},
    { field: 'parent_id_tag', headerName: 'Parent ID', flex: 2, editable: true},
    { field: 'description', headerName: 'Description', flex: 4, editable: true},
    { field: 'status', headerName: 'Status', flex: 2, type: 'singleSelect',
      valueOptions: ['Activated', 'Blocked'], editable: true 
    },
    { field: 'priority', headerName: 'Priority', flex: 2,
      editable: true, type: 'number'},
    { field: 'delete', headerName: '', flex: 1,
        renderCell: (params) => {
          if (params.row.id_tag == BLANKTAG.id_tag)
            return <div></div>
          else
            return <Button onClick={() => {delete_tag(params.row.id_tag)}}><DeleteIcon color="error"/></Button>
        },
     },      
  ];

  function getRowId(tag: GridRowModel): GridRowId {
    return tag.id_tag;
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
        rows={tagData}
        density="compact"
        slots={{ toolbar: CustomToolbar }}
        // @ts-expect-error Much easier this way
        columns={columns}
        sx={{fontSize: '.8rem'}}
        processRowUpdate={processRowUpdate}
        isCellEditable={(params: GridRowModel) => (params.field != 'id_tag' && params.field != 'delete') || (params.field == 'id_tag' && params.value == BLANKTAG.id_tag) }
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

export default TagTable;


