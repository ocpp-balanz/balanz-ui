import * as React from 'react';
import { useState } from 'react';
import {
  TextField, Select, MenuItem, Button, Grid2, Paper, InputLabel, FormControl,
  Box
} from '@mui/material';
import dayjs from 'dayjs';
import BalanzAPI from '../services/balanz_api';
import LogDisplay from '../components/LogDisplay';
import Container from '@mui/material/Container';
import { LOGENTRY } from '../types/types';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

interface LogsProp {
  api: BalanzAPI;
}

type LogFilters = {
  messageSearch?: string;
  timeStampStart?: string;
  timeStampEnd?: string;
  logger?: string;
};

const Logs: React.FC<LogsProp> = ({ api }) => {
  const [filters, setFilters] = useState<LogFilters>({
    messageSearch: '',
    timeStampStart: dayjs().subtract(24, 'hour').format('YYYY-MM-DD HH:mm'),
    timeStampEnd: undefined,
    logger: 'AUDIT',
  });
  const [logs, setLogs] = useState<LOGENTRY[]>([]);

  const handleChange = (field: keyof LogFilters) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setFilters(prev => ({ ...prev, [field]: event.target.value as string }));
  };

  // Get tags
  const getLogs = async() => {
    const filtered = Object.fromEntries(
      Object.entries(filters).filter(
        ([_, v]) => v !== undefined && v !== '' && v != 'ALL'
      )
    );
    const [ok, payload] = await api.call("GetLogs", {"filters": filtered});
    if (ok == 3) {    
      setLogs(payload["logs"]);
      console.log("Succesfully retrieved logs, #", logs.length);
    } else {
      console.log("Error getting logs")  
      setLogs([]);   
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Container maxWidth={false} disableGutters sx={{ fontSize: '.8rem' }}>
            <Paper sx={{ padding: 2, marginBottom: 2, p: 2}}>
              <Grid2 container spacing={2}>
                <Grid2 sx={{ width: '10%'}}>
                  <FormControl fullWidth>
                    <InputLabel id="logger-label">Log Type</InputLabel>
                    <Select
                      labelId="logger-label"
                      value={filters.logger} // default to 'AUDIT'
                      label="Module"
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilters((prev) => ({
                          ...prev,
                          logger: value
                        }));
                      }}
                    >
                      <MenuItem value="ALL">All</MenuItem>
                      <MenuItem value="AUDIT">Audit</MenuItem>
                    </Select>
                  </FormControl>                
                </Grid2>
                <Grid2 sx={{ width: '30%'}}>
                  <TextField
                    label="Message Search"
                    fullWidth
                    value={filters.messageSearch}
                    onChange={handleChange('messageSearch')}
                  />
                </Grid2>
                <Grid2>
                  <DateTimePicker
                    label="Start Time"
                    value={filters.timeStampStart ? dayjs(filters.timeStampStart) : null}
                    onChange={(newValue) => {
                      setFilters(prev => ({
                        ...prev,
                        timeStampStart: newValue ? newValue.format('YYYY-MM-DD HH:mm') : undefined
                      }));
                    }}
                    ampm={false}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />                
                </Grid2>
                <Grid2>
                  <DateTimePicker
                    label="End Time"
                    value={filters.timeStampEnd ? dayjs(filters.timeStampEnd) : null}
                    onChange={(newValue) => {
                      setFilters(prev => ({
                        ...prev,
                        timeStampEnd: newValue ? newValue.format('YYYY-MM-DD HH:mm') : undefined
                      }));
                    }}
                    ampm={false} 
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />                
                </Grid2>
                <Grid2 sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button variant="contained" onClick={getLogs}>
                    Get Logs
                  </Button>
                </Grid2>
              </Grid2>
            </Paper>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '700px' }}>
            <LogDisplay logs={logs} />
          </Box>
        </Container>
      </LocalizationProvider>
    </Box>
  );
};

export default Logs;
