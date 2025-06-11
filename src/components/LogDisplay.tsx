import * as React from 'react';
import Box from '@mui/material/Box';
import { Grid } from '@mui/material';
import { LOGENTRY } from '../types/types';

interface LogDisplayProps {
  logs: LOGENTRY[];
};

const LogDisplay: React.FC<LogDisplayProps> = ({logs}) => {
  return (
    <Grid 
        sx={{ 
        fontFamily: 'monospace', 
        mx: 1, 
        overflow: 'auto', 
        width: '100%', 
        overflowX: 'scroll',
        display: 'flex',
        flexDirection: 'column'}}>
        {logs.map((log, i) => {
            return(
                <Box key={i} sx={{ textAlign: 'left', py: 0.1, whiteSpace: 'nowrap'}}>
                    {log.timestamp + " " + log.level + " " + log.logger + ": " + log.message}
                </Box>
            );
        })}  
    </Grid>
  );
};

export default LogDisplay;
