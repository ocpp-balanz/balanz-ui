import * as React from 'react';
import { useEffect, useState } from 'react';
import BalanzAPI from '../services/balanz_api';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

interface LogDisplayProps {
  api: BalanzAPI;
};

const LogDisplay: React.FC<LogDisplayProps> = ({api}) => {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const snack = (message: string) => {
    setMessage(message);
    setOpen(true);
  };

  const handleClose = () => {setOpen(false)};

  // Get tags
  useEffect(() => {
  }, 
  [api]);

  return (
    <Stack>
        TBD - logs come here
    </Stack>
  );
};

export default LogDisplay;

