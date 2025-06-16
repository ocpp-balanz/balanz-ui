import * as React from 'react';
import { useEffect, useState } from 'react';
import { FIRMWARE } from '../types/types';
import BalanzAPI from '../services/balanz_api';
import { DataGrid, GridColDef, GridRowId, GridRowModel, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

interface FirmwareTableProps {
  api: BalanzAPI;
};

const BLANKFirmware: FIRMWARE = { 
  firmware_id: '(new firmware)',
  charge_point_vendor: '',
  charge_point_model: '',
  firmware_version: '',
  meter_type: '',
  url: '',
  upgrade_from_versions: ''
};

const FirmwareTable: React.FC<FirmwareTableProps> = ({api}) => {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [firmwareData, setFirmwareData] = useState<Array<FIRMWARE>>([]);

  const snack = (message: string) => {
    setMessage(message);
    setOpen(true);
  };

  const handleClose = () => {setOpen(false)};

  // Get tags
  useEffect(() => {
    const getFirmware = async() => {
      const [ok, payload] = await api.call("GetFirmware", {});
      if (ok == 3) {
        console.log("Succesfully retrieved firmware, #", payload.length);
        setFirmwareData([BLANKFirmware, ...payload]);
      } else {
        console.log("Error getting firmware")
        snack("Error getting firmware");
      }
    }
    getFirmware();
  }, 
  [api]);

  const processRowUpdate = React.useCallback(
    async (updatedRow: GridRowModel, originalRow: GridRowModel) => {
      const payload = {"firmware_id": updatedRow.firmware_id}
      for (const [key, value] of Object.entries(updatedRow)) {
        // @ts-expect-error Much easier this way
          payload[key] = value;
      }
  
      if (updatedRow["firmware_id"] == BLANKFirmware.firmware_id) {
        snack("Firmware ID must be set first")
        return originalRow;
      }
  
      if (originalRow["firmware_id"] == BLANKFirmware.firmware_id) {
        const [ok,] = await api.call("CreateFirmware", payload);
        if (ok == 3) {
          snack("Succesfully created firmware");
          return updatedRow;
        } else {
          snack("Error creating firmware");
          return originalRow;
        }
      } else {
        const [ok,] = await api.call("ModifyFirmware", payload);
        if (ok == 3) {
          snack("Succesfully updated firmware");
          return updatedRow;
        } else {
          snack("Error updating firmware");
          return originalRow;
        }
      }
    }, [api]
  );

  async function delete_firmware(firmware_id: string) {
    const [ok,] = await api.call("DeleteFirmware", {"firmware_id": firmware_id});
    if (ok == 3) {
      setFirmwareData(firmwareData.filter((firmware) => firmware.firmware_id != firmware_id));
      snack("Succesfully deleted firmware");
    } else {
      snack("Error deleting firmware");
    }
  }

  const columns: GridColDef<(typeof firmwareData)[number]>[] = [
    { field: 'firmware_id', headerName: 'ID', flex: 2, editable: true },
    { field: 'charge_point_vendor', headerName: 'Vendor (regexp)', flex: 2, editable: true },
    { field: 'charge_point_model', headerName: 'Model (regexp)', flex: 2, editable: true },
    { field: 'firmware_version', headerName: 'Firmware Version', flex: 2, editable: true },
    { field: 'meter_type', headerName: 'Meter Type', flex: 2, editable: true },
    { field: 'url', headerName: 'Firmware URL', flex: 2, editable: true },
    { field: 'upgrade_from_versions', headerName: 'Upgrade from versions', flex: 2, editable: true },
    { field: 'delete', headerName: '', flex: 1,
        renderCell: (params) => {
          if (params.row.firmware_id == BLANKFirmware.firmware_id)
            return <div></div>
          else
            return <Button onClick={() => {delete_firmware(params.row.firmware_id)}}><DeleteIcon color="error"/></Button>
        },
     },      
  ];

  function getRowId(firmware: GridRowModel): GridRowId {
    return firmware.firmware_id;
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
        rows={firmwareData}
        density="compact"
        slots={{ toolbar: CustomToolbar }}
        // @ts-expect-error Much easier this way
        columns={columns}
        sx={{fontSize: '.8rem'}}
        processRowUpdate={processRowUpdate}
        isCellEditable={(params: GridRowModel) => (params.field != 'firmware_id' && params.field != 'delete') || (params.field == 'firmware_id' && params.value == BLANKFirmware.firmware_id) }
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

export default FirmwareTable;
