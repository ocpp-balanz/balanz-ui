import * as React from 'react';
import { useState } from 'react';
import {
  TextField, Select, MenuItem, Button, Grid, Paper, InputLabel, FormControl
} from '@mui/material';
import dayjs from 'dayjs';
import BalanzAPI from '../services/balanz_api';
import LogDisplay from '../components/LogDisplay';
import Container from '@mui/material/Container';
import { LOGENTRY } from '../types/types';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { SelectChangeEvent } from '@mui/material/Select';

interface LogsProp {
  api: BalanzAPI;
}

type LogFilters = {
  messageSearch?: string;
  timeStampStart?: string;
  timeStampEnd?: string;
  logger?: string;
};

const loggerOptions = [
  'model',
  'ocpp',
  'balanz',
  'cp_v16',
  'websockets.client',
  'websockets.server',
  'api',
  'user',
  'AUDIT'
];

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
        ([_, v]) => v !== undefined && v !== ''
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
    <React.Fragment>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Container maxWidth={false} disableGutters sx={{ mt: 2, fontSize: '.8rem' }}>
            <Paper sx={{ padding: 2, marginBottom: 2 }}>
              <Grid container spacing={2}>
                <Grid sx={{ width: '10%'}}>
                  <FormControl fullWidth>
                    <InputLabel>Module</InputLabel>
                    <Select
                      value={filters.logger}
                      label="Module"
                      onChange={(e: SelectChangeEvent<string>) => {
                        setFilters((prev) => ({
                          ...prev,
                          logger: e.target.value || undefined,
                        }));
                      }}
                    >
                      <MenuItem value="">Any</MenuItem>
                      {loggerOptions.map((logger) => (
                        <MenuItem key={logger} value={logger}>
                          {logger}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid sx={{ width: '30%'}}>
                  <TextField
                    label="Message Search"
                    fullWidth
                    value={filters.messageSearch}
                    onChange={handleChange('messageSearch')}
                  />
                </Grid>
                <Grid>
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
                  />                </Grid>
                <Grid>
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
                </Grid>
                <Grid sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button variant="contained" onClick={getLogs}>
                    Get Logs
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          <LogDisplay logs={logs} />
        </Container>
      </LocalizationProvider>
    </React.Fragment>
  );
};

export default Logs;
