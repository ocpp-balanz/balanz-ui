import { useState } from "react";
import DialogTitle from "@mui/material/DialogTitle";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import BalanzAPI from "../services/balanz_api";
import TextField from "@mui/material/TextField";

export interface RemoteStartProp {
  api: BalanzAPI;
  charger_id: string;
  charger_alias: string;
  connector_id: number;
  snack: (message: string) => void;
}

const RemoteStart: React.FC<RemoteStartProp> = ({
  api,
  charger_id,
  charger_alias,
  connector_id,
  snack,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const remoteStart = async (id_tag: string) => {
    handleClose();
    const [ok] = await api.call("RemoteStartTransaction", {
      charger_id: charger_id,
      connector_id: connector_id,
      id_tag: id_tag,
    });
    if (ok == 3) {
      snack("Remote start successful - status may take a while to update");
    } else {
      snack("Remote start failed");
    }
  };

  return (
    <>
      <PlayCircleIcon
        sx={{ mt: 0.5 }}
        onClick={handleClickOpen}
      ></PlayCircleIcon>
      <Dialog
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            component: "form",
            onSubmit: (event: React.FormEvent<HTMLDivElement>) => {
              event.preventDefault();
              const form = event.currentTarget.querySelector("form");
              if (form == null) return;
              const formData = new FormData(form);
              const formJson = Object.fromEntries(formData.entries()) as Record<
                string,
                FormDataEntryValue
              >;
              const id_tag = formJson.id_tag;
              if (typeof id_tag === "string") {
                void remoteStart(id_tag);
              }
            },
          },
        }}
      >
        <DialogTitle>Confirm Start Charging</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            To remotely start charging session on {charger_alias} ({charger_id})
            connector {connector_id} enter a valid tag.
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="id_tag"
            name="id_tag"
            label="Tag"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" autoFocus>
            Start
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RemoteStart;
