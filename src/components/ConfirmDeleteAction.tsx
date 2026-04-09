import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import DeleteIcon from "@mui/icons-material/Delete";

export interface ConfirmDeleteActionProps {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
}

const ConfirmDeleteAction: React.FC<ConfirmDeleteActionProps> = ({
  title,
  description,
  onConfirm,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirm = async () => {
    handleClose();
    await onConfirm();
  };

  return (
    <>
      <DeleteIcon color="error" sx={{ mt: 0.5 }} onClick={handleClickOpen} />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            No
          </Button>
          <Button onClick={() => void handleConfirm()}>Yes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfirmDeleteAction;
