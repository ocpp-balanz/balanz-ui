import { useState } from "react";
import DialogTitle from "@mui/material/DialogTitle";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import BalanzAPI from "../services/balanz_api";

export interface RemoteStopProp {
  api: BalanzAPI;
  charger_id: string;
  charger_alias: string;
  connector_id: number;
  transaction_id: number;
  snack: Function;
}

const RemoteStop: React.FC<RemoteStopProp> = ({
  api,
  charger_id,
  charger_alias,
  connector_id,
  transaction_id,
  snack,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const remoteStop = async () => {
    handleClose();
    const [ok] = await api.call("RemoteStopTransaction", {
      charger_id: charger_id,
      connector_id: connector_id,
      transaction_id: transaction_id,
    });
    if (ok) {
      snack("Remote stop successful - status may take a while to update");
    } else {
      snack("Remote stop failed");
    }
  };

  return (
    <>
      <StopCircleIcon
        sx={{ mt: 0.5 }}
        onClick={handleClickOpen}
      ></StopCircleIcon>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Confirm Stop Charging</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to remotely stop the charging session on{" "}
            {charger_alias} ({charger_id}) connector {connector_id}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>No</Button>
          <Button onClick={remoteStop} autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RemoteStop;
