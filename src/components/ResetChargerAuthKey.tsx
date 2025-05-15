import { useState } from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import KeyOffIcon from '@mui/icons-material/KeyOff';
import BalanzAPI from '../services/balanz_api';

export interface ResetChargerAuthKeyProp {
  api: BalanzAPI;
  charger_id: string;
  charger_alias: string;
  snack: Function;
}

const ResetChargerAuthKey: React.FC<ResetChargerAuthKeyProp> = ({api, charger_id, charger_alias, snack}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const resetChargerAuth = async() => {
    handleClose();
    const [ok,] = await api.call("ResetChargerAuth", {charger_id: charger_id });
    if (ok) {
      snack("Charger Authorization Key reset succesful");
    } else {
      snack("Charger Authorization Key reset failed");
    }
  }

  return (<>
    <KeyOffIcon onClick={handleClickOpen}></KeyOffIcon>
    <Dialog open={open}  onClose={handleClose}>
        <DialogTitle>Confirm Charger Authorization Key Reset</DialogTitle>
        <DialogContent>
        <DialogContentText id="alert-dialog-description">
            Are you sure you want to reset the charger authorization key on {charger_alias} ({charger_id})?
        </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>No</Button>
          <Button onClick={(() => {resetChargerAuth()})} autoFocus>Yes</Button>
        </DialogActions>
    </Dialog>
    </>
  );
}

export default ResetChargerAuthKey;
