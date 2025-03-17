import * as React from 'react';
import { useEffect, useState } from 'react';
import { SESSION, GROUP } from '../types/types';
import { BarChart } from '@mui/x-charts/BarChart';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { DataGrid, GridColDef, GridToolbarContainer, GridToolbarExport, GridSlotsComponentsProps } from '@mui/x-data-grid';
import { Divider } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';


interface SessionStatisticsProps {
  sessionData: Array<SESSION>;
  groupData: Array<GROUP>;
};

type DATAENTRY = {
  id: string;
  timestamp: Date;
  x: string;
  energy: number;
};

declare module '@mui/x-data-grid' {
  interface FooterPropsOverrides {
    total: number;
  }
}

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <Box sx={{ flexGrow: 1 }} />
      <GridToolbarExport/>
    </GridToolbarContainer>
  );
}

const SessionStatistics: React.FC<SessionStatisticsProps> = ({sessionData, groupData}) => {
  const [period, setPeriod] = useState<string>('last48hours');
  const [group, setGroup] = useState<string>('(all)');
  const [dataset, setDataset] = useState<Array<DATAENTRY>>([]);
  const [total, setTotal] = useState<number>(0);
  const [sessionAugmented, setSessionAugmented] = useState<boolean>(false);
  const [dateview, setDateview] = useState<Array<String>>(['year', 'month', 'day']);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(48, 'hours'));

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setPeriod(event.target.value as string);
  };

  const handleGroupChange = (event: SelectChangeEvent) => {
    setGroup(event.target.value as string);
  };

  const columns: GridColDef<DATAENTRY>[] = [
    { field: 'id', headerName: 'Timestamp', flex: 2},
    { field: 'energy', headerName: 'Energy (kWh)', type: 'number', valueGetter: (value) => {return (value/1).toFixed(3)}, flex: 2},
  ];
  
  function CustomFooterComponent(
    props: NonNullable<GridSlotsComponentsProps['footer']>,
  ) {
    return (
      <>
        <Divider />
        <Stack direction="row" sx={{ mx: 1.1, my: 1}}>
          <b>Total</b>
          <Box sx={{ flexGrow: 1 }} />
          <b>{props.total?.toFixed(3)}</b>
        </Stack>
      </>
    );
  }
    
  // Set start date chooser upon new period set.
  useEffect(() => {
    if (period === "last48hours") {
      setStartDate(dayjs().subtract(47, 'hours').startOf('hour'));
      setDateview(['year', 'month', 'day']);
    }
    else if (period === "48hours") {
      setStartDate(dayjs().startOf('month').startOf('day'));
      setDateview(['year', 'month', 'day']);
    }
    else if (period === 'lastmonth') {
      setStartDate(dayjs().subtract(1, 'months').startOf('day').add(1, 'day'));
      setDateview(['year', 'month']);
    }
    else if (period === 'month') {
      setStartDate(dayjs().startOf('month').startOf('day'));
      setDateview(['month', 'year']);
    }
    else if (period === 'year') {
      setStartDate(dayjs().startOf('year').startOf('day'));
      setDateview(['year']);
    }
    else if (period === 'overall') {
      if (dataset.length > 0) {
        setStartDate(dayjs(dataset[0].timestamp).startOf('year').startOf('day'));
        setDateview(['year']);
      }
    }
  }, 
  [period]);

  // Recalc total
  useEffect(() => {
    let sum = 0;
    for (let i = 0; i < dataset.length; i++)
      sum += dataset[i].energy;
    setTotal(sum);
  }, 
  [dataset]);

  // Initial augmentation of sessionData. For each historic CHARGING_ENTRY element,
  // a net Wh usage value will be added.
  useEffect(() => {
    for (let i = 0; i < sessionData.length; i++) {
      // First, let's quickly set the date field
      sessionData[i].charging_history.map((e) => {
        e.date = new Date(e.timestamp * 1000);
      });
  
      // Next, let's review the entries in more details to determine wh...
      let usage = null;
      let total_wh = 0.0;
      for (let ci = 0; ci < sessionData[i].charging_history.length; ci++) {
        // Work out how long this interval is.
        let seconds = 0;
        if (ci == sessionData[i].charging_history.length - 1) {
          if (sessionData[i].end_time != null)
            seconds = sessionData[i].end_time - sessionData[i].charging_history[ci].timestamp;
          else
            seconds = Date.now() / 1000 - sessionData[i].charging_history[ci].timestamp;
        } else {
          seconds = sessionData[i].charging_history[ci + 1].timestamp - sessionData[i].charging_history[ci].timestamp;
        }
        if (sessionData[i].charging_history[ci].usage != null)
          usage = sessionData[i].charging_history[ci].usage;
        else if (usage == null && sessionData[i].charging_history[ci].offered != null) {
          usage = sessionData[i].charging_history[ci].offered;
        }
        sessionData[i].charging_history[ci].wh = (usage ?? 0) * seconds / 3600.0;
        total_wh += sessionData[i].charging_history[ci].wh ?? 0;
      }

      if (total_wh != 0) {
        // Adjust proportionally to make sure energy total is correct. 
        // Note, that this factor will also take care of the missing voltage (230V) and # phases (typically 3)
        const factor = sessionData[i].energy_meter / total_wh;
        for (let ci = 0; ci < sessionData[i].charging_history.length - 1; ci++)
          sessionData[i].charging_history[ci].wh = (sessionData[i].charging_history[ci].wh??0) * factor;
      }
    }
    setSessionAugmented(true);
  }, 
  [sessionData, sessionAugmented]);

  // Transform sessionData to required graph dataset
  useEffect(() => {
    if (!sessionAugmented || startDate == null) 
      return;

    // Basic algorithm is to first create a number of time interval "buckets" based on the period setting.
    // Then next step is to distribute the charging entry wh values into those buckets (assuming of course
    // that the session is inside the desired overall period at all).

    // Prepare the array ("buckets") ..
    const result: Array<DATAENTRY> = [];

    // Daily itervals
    if (period == 'month' || period == 'lastmonth') {
      let end_date = startDate.add(1, 'month');
      for (let date = startDate; date <= end_date; date = date.add(1, 'day')) {
        result.push({id: date.format('YYYY-MM-DD'), x: date.format('DD'), energy: 0, timestamp: date.toDate()});
      }
    } else if (period == "48hours" || period == "last48hours") {
      let end_date = startDate.add(48, 'hours');
      for (let date = startDate; date <= end_date; date = date.add(1, 'hour')) {
        result.push({id: date.format('YYYY-MM-DD-HH'), x: date.format('DD') + '\n' + date.format('HH'), energy: 0, timestamp: date.toDate()});
      } 
    } else if (period == "year") {
      let end_date = startDate.add(1, 'year');
      for (let date = startDate; date <= end_date; date = date.add(1, 'month')) {
        result.push({id: date.format('YYYY-MM'), x: date.format('MMM'), energy: 0, timestamp: date.toDate()});
      } 
    } else if (period == "overall") {
      let end_date = dayjs().add(1, 'year').startOf('year');
      for (let date = startDate; date <= end_date; date = date.add(1, 'year')) {
        result.push({id: date.format('YYYY'), x: date.format('YYYY'), energy: 0, timestamp: date.toDate()});
      } 
    }

    // Then add energy from sessions. 
    const start_date_sec = startDate.toDate().getTime() / 1000.0;
    for (let i = 0; i < sessionData.length; i++) {
      if (group != "(all)" && group != sessionData[i].group_id)
        continue;

      // Is the session relevant at all, time-wise? If not, quickly move on...
      if (sessionData[i].end_time != null && sessionData[i].end_time < start_date_sec)  
        continue;

      // Iterate charging entries and put into the right bucket(s)
      for (let ci = 0; ci < sessionData[i].charging_history.length; ci++) {
        const start = sessionData[i].charging_history[ci].date??new Date();
        let end = null;
        if (ci == sessionData[i].charging_history.length - 1) {
          if (sessionData[i].end_time != null)
            end = new Date(sessionData[i].end_time * 1000);
          else
            end = new Date();
        } else {
          end = sessionData[i].charging_history[ci + 1].date??new Date();
        }
        if (start == end)
          continue;   // Same second admin type entry - skip it.

        let remain = sessionData[i].charging_history[ci].wh??0;
        for (let bucket_index = 0; bucket_index < result.length - 1; bucket_index++) {
          const bstart = result[bucket_index].timestamp;
          const bend = result[bucket_index + 1].timestamp;

          // How much overlap
          const overlap_ms = Math.min(end.getTime(), bend.getTime()) - Math.max(start.getTime(), bstart.getTime());
          if (overlap_ms <= 0)
            continue;

          // Vs. length? - this determines the relative contribution
          const contrib_wh = (sessionData[i].charging_history[ci].wh??0) * (overlap_ms / (end.getTime() - start.getTime()));
          result[bucket_index].energy += contrib_wh / 1000.0; 
          remain -= contrib_wh;
        }
      }
    }
    // The last bucket is not filled. Let's remove it
    if (result.length > 0 && result[result.length - 1].energy == 0 && (period == 'last48hours' || period == 'lastmonth' || period == 'overall')) 
      result.pop();

    setDataset(result);
  }, 
  [period, group, sessionData, sessionAugmented, startDate]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box>
      <div>{startDate?.format()}</div>
      <FormControl sx={{m: 1, minWidth: 100}}>
        <InputLabel id="select-period">Period</InputLabel>
        <Select
          labelId="select-period"
          id="select-period"
          value={period}
          label="Period"
          onChange={handlePeriodChange}
          sx={{fontSize: '.9rem'}}
        >
          <MenuItem value={'last48hours'} sx={{fontSize: '.9rem'}}>Last 48 hours</MenuItem>
          <MenuItem value={'lastmonth'} sx={{fontSize: '.9rem'}}>Last month</MenuItem>
          <MenuItem value={'48hours'} sx={{fontSize: '.9rem'}}>48 hours</MenuItem>
          <MenuItem value={'month'} sx={{fontSize: '.9rem'}}>Month</MenuItem>
          <MenuItem value={'year'} sx={{fontSize: '.9rem'}}>Year</MenuItem>
          <MenuItem value={'overall'} sx={{fontSize: '.9rem'}}>Overall</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{m: 1, minWidth: 200}}>
        <DatePicker 
          views={dateview}
          label="Start"
          sx={{fontSize: '.9rem'}}
          value={startDate}
          onChange={(newValue) => {
            if (newValue !== null) 
              setStartDate(newValue);
          }}      
        />
      </FormControl>
      <FormControl sx={{m: 1, minWidth: 100}}>
        <InputLabel id="select-group">Group</InputLabel>
        <Select
          labelId="select-group"
          id="select-group"
          value={group}
          label="Group"
          onChange={handleGroupChange}
          sx={{fontSize: '.9rem'}}
        >
          <MenuItem value={'(all)'} sx={{fontSize: '.9rem'}}>(all)</MenuItem>
          {groupData.map((group) => (
            <MenuItem key={group.group_id} value={group.group_id} sx={{fontSize: '.9rem'}}>{group.group_id}</MenuItem>            
          ))}
        </Select>
      </FormControl>
      <BarChart
        dataset={dataset}
        xAxis={
          [{ scaleType: 'band', dataKey: 'x'}]
        }
        series={[{ dataKey: 'energy', label: "Energy (kWh)"}]}
        grid={{ horizontal: true }}
        height={400}
      />
      <DataGrid 
        hideFooterPagination={true}
        rows={dataset}
        columns={columns}
        density="compact"
        sx={{fontSize: '.8rem', width:250}}
        slots={{ toolbar: CustomToolbar, footer: CustomFooterComponent }}
        slotProps={{
          footer: { total }
        }}
      />
    </Box>
    </LocalizationProvider>

  );
};

export default SessionStatistics;
