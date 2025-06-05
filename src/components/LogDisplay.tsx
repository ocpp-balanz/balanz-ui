import * as React from 'react';
import { useEffect, useState } from 'react';
import BalanzAPI from '../services/balanz_api';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { LOGENTRY } from '../types/types';

const LogItem = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(0.1),
  textAlign: 'left',
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));


interface LogDisplayProps {
  api: BalanzAPI;
};

const LogDisplay: React.FC<LogDisplayProps> = ({api}) => {
  const [logs, setLogs] = useState<LOGENTRY[]>([]);

  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const snack = (message: string) => {
    setMessage(message);
    setOpen(true);
  };

  const handleClose = () => {setOpen(false)};

  // Get tags
  useEffect(() => {
    const getLogs = async() => {
        const [ok, payload] = await api.call("GetLogs", {});
      if (ok == 3) {    
        setLogs(payload["logs"]);
        console.log("Succesfully retrieved logs, #", logs.length);
      } else {
        console.log("Error getting logs")  
        snack("Error getting logs");   
        setLogs([]);   
      }
    }
    getLogs();
  }, 
  [api]);

  return (
    <Stack>
        {logs.map((log, i) => {
            return(
                <LogItem key={i}>{log.timestamp + " " + log.level + ": " + log.message}</LogItem>
            );
        })}  
    </Stack>
  );
};

export default LogDisplay;

