import { useState } from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import BalanzAPI from '../services/balanz_api';
import DeleteIcon from '@mui/icons-material/Delete';

export interface DeleteChargerProp {
  api: BalanzAPI;
  charger_id: string;
  charger_alias: string;
  snack: Function;
}

const DeleteCharger: React.FC<DeleteChargerProp> = ({api, charger_id, charger_alias, snack}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const remoteStop = async () => {
    handleClose();
    const [ok,] = await api.call("DeleteCharger", {charger_id: charger_id});
    if (ok) {
      snack("Charger succesfully deleted - pls manually refresh table");
    } else {
      snack("Failed to delete charger");
    }
  }

  return (<>
    <DeleteIcon color="error" sx={{mt:.5}} onClick={handleClickOpen}></DeleteIcon>
    <Dialog open={open}  onClose={handleClose}>
        <DialogTitle>Confirm Delete Charger</DialogTitle>
        <DialogContent>
        <DialogContentText id="alert-dialog-description">
            Are you really really sure that you want to delete the charger {charger_alias} ({charger_id})?
        </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>No</Button>
          <Button onClick={remoteStop}>Yes</Button>
        </DialogActions>
    </Dialog>
    </>
  );
}

export default DeleteCharger;
