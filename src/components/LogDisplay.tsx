import * as React from 'react';
import { useEffect, useState } from 'react';
import BalanzAPI from '../services/balanz_api';
import Box from '@mui/material/Box';
import { LOGENTRY } from '../types/types';

interface LogDisplayProps {
  api: BalanzAPI;
};

const LogDisplay: React.FC<LogDisplayProps> = ({api}) => {
  const [logs, setLogs] = useState<LOGENTRY[]>([]);

  // Get tags
  useEffect(() => {
    const getLogs = async() => {
        const [ok, payload] = await api.call("GetLogs", {});
      if (ok == 3) {    
        setLogs(payload["logs"]);
        console.log("Succesfully retrieved logs, #", logs.length);
      } else {
        console.log("Error getting logs")  
        setLogs([]);   
      }
    }
    getLogs();
  }, 
  [api]);

  return (
    <Box sx={{ 
        fontFamily: 'monospace', 
        mx: 1, 
        overflow: 'auto', 
        width: '100%', 
        overflowX: 'auto',
        display: 'flex',
        flexDirection: 'column'}}>
        {logs.map((log, i) => {
            return(
                <Box key={i} sx={{ textAlign: 'left', py: 0.1, whiteSpace: 'nowrap'}}>
                    {log.timestamp + " " + log.level + " " + log.logger + ": " + log.message}
                </Box>
            );
        })}  
    </Box>
  );
};

export default LogDisplay;

