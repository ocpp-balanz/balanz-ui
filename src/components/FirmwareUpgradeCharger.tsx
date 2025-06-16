import { useState } from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import BalanzAPI from '../services/balanz_api';

export interface FirmwareUpgradeChargerProp {
  api: BalanzAPI;
  charger_id: string;
  charger_alias: string;
  snack: Function;
}

const FirmwareUpgradeCharger: React.FC<FirmwareUpgradeChargerProp> = ({api, charger_id, charger_alias, snack}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const reset = async(mode: string) => {
    handleClose();
    const [ok,] = await api.call("Reset", {charger_id: charger_id, type: mode });
    if (ok) {
      snack("Reset succesful");
    } else {
      snack("Reset failed");
    }
  }

  return (<>
    <UpgradeIcon onClick={handleClickOpen}></UpgradeIcon>
    <Dialog open={open}  onClose={handleClose}>
        <DialogTitle>Confirm Charger Firmware Upgrade</DialogTitle>
        <DialogContent>
        <DialogContentText id="alert-dialog-description">
            Are you sure you want to upgrade the firmware on {charger_alias} ({charger_id})?
        </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>No</Button>
          <Button onClick={(() => {reset("Hard")})}>Hard Reset</Button>
          <Button onClick={(() => {reset("Soft")})} autoFocus>Soft Reset</Button>
        </DialogActions>
    </Dialog>
    </>
  );
}

export default FirmwareUpgradeCharger;
