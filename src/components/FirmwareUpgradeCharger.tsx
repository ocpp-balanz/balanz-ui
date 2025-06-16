import { useState, useEffect } from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import BalanzAPI from '../services/balanz_api';
import { FIRMWARE_OPTION } from '../types/types';
import List from '@mui/material/List';
import { ListItemButton, ListItemText } from '@mui/material';

export interface FirmwareUpgradeChargerProp {
  api: BalanzAPI;
  charger_id: string;
  charger_alias: string;
  snack: Function;
  fw_options: Array<FIRMWARE_OPTION>;
}

const FirmwareUpgradeCharger: React.FC<FirmwareUpgradeChargerProp> = ({api, charger_id, charger_alias, snack, fw_options}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<FIRMWARE_OPTION | null>(null);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

   useEffect(() => {
    if (open && fw_options.length > 0) {
      setSelectedOption(fw_options[0]);
    }
  }, [open, fw_options]);

  const update = async() => {
    handleClose();
    const url = selectedOption? selectedOption.url : "";
    const [ok,] = await api.call("UpdateFirmware", {charger_id: charger_id, location: url});
    if (ok) {
      snack("Firmware update initiated. Check status and logs");
    } else {
      snack("Firmware update failed to initialize");
    }
  }

  return (<>
    <UpgradeIcon sx={{mt: .5}} onClick={handleClickOpen}></UpgradeIcon>
    <Dialog open={open}  onClose={handleClose}>
        <DialogTitle>Confirm Charger Firmware Upgrade</DialogTitle>
        <DialogContent>
        <DialogContentText id="alert-dialog-description">
            Please choose firmware to install on {charger_alias} ({charger_id}) or select cancel.
        </DialogContentText>
        <List>
          {fw_options.map((option) => (
            <ListItemButton
              key={option.firmware_id}
              selected={selectedOption === option}
              onClick={() => setSelectedOption(option)}
            >
            <ListItemText primary={option.firmware_id} />
            </ListItemButton>
          ))}
        </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={(() => {update()})}>Update</Button>
        </DialogActions>
    </Dialog>
    </>
  );
}

export default FirmwareUpgradeCharger;
