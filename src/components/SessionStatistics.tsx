import * as React from 'react';
import { useEffect, useState } from 'react';
import { SESSION, GROUP, CHARGER, CHARGING_ENTRY } from '../types/types';
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
  chargerData: Array<CHARGER>;
};

type DATAENTRY = {
  id: string;
  timestamp: number;
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

const SessionStatistics: React.FC<SessionStatisticsProps> = ({sessionData, groupData, chargerData}) => {
  const [period, setPeriod] = useState<string>('last48hours');
  const [group, setGroup] = useState<string>('(all)');
  const [charger, setCharger] = useState<string>('(all)');
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
    setCharger("(all)");
  };

  const handleChargerChange = (event: SelectChangeEvent) => {
    setCharger(event.target.value as string);
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
      if (sessionData.length > 0) {
        setStartDate(dayjs.unix(sessionData[0].start_time).startOf('year').startOf('day'));
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

      // Some entries in sessions may be errored, having end_time ahead of start_time.
      // Hack it dramatically.
      if (sessionData[i].end_time != null && sessionData[i].end_time <= sessionData[i].start_time) {
        sessionData[i].end_time = sessionData[i].start_time + 1800;  // 30 min
        console.log("WARNING: Session " + i + ": end time is before start time. Setting to " + sessionData[i].end_time, "usage is", sessionData[i].kwh);
      }
  
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

      // Ok, that was fun. Do instead hourly entries and distribute across these. This will be much
      // more usefull later on.
      const hour_entries: Array<CHARGING_ENTRY> = [];
      const start_date = dayjs.unix(sessionData[i].start_time).startOf("hour");
      let end_date = sessionData[i].end_time == null? dayjs(): dayjs.unix(sessionData[i].end_time);
      end_date = end_date.add(1, 'hour').startOf("hour");   // Ensure final entry extends.
      for (let date = start_date; date <= end_date; date = date.add(1, 'hour'))
        hour_entries.push({timestamp: date.unix(), offered: null, usage: null, date: date.toDate(), wh: 0});

      // Iterate charging entries and put into the right hour_entry
      for (let ci = 0; ci < sessionData[i].charging_history.length; ci++) {
        const start = sessionData[i].charging_history[ci].timestamp;
        let end = null;
        if (ci == sessionData[i].charging_history.length - 1) {
          if (sessionData[i].end_time != null)
            end = sessionData[i].end_time;
          else
            end = dayjs().unix();
        } else {
          end = sessionData[i].charging_history[ci + 1].timestamp;
        }
        if (start == end)
          continue;   // Same second admin type entry - skip it.

        let remain = sessionData[i].charging_history[ci].wh??0;
        for (let hour_index = 0; hour_index < hour_entries.length - 1; hour_index++) {
          const bstart = hour_entries[hour_index].timestamp;
          const bend = hour_entries[hour_index + 1].timestamp;

          // How much overlap
          const overlap_s = Math.min(end, bend) - Math.max(start, bstart);
          if (overlap_s <= 0)
            continue;

          // Vs. length? - this determines the relative contribution
          const contrib_wh = (sessionData[i].charging_history[ci].wh??0) * (overlap_s / (end - start));
          if (hour_entries[hour_index].wh == null)
            hour_entries[hour_index].wh = contrib_wh;
          else
            // @ts-expect-error
            hour_entries[hour_index].wh += contrib_wh; 
          remain -= contrib_wh;
        }
        if (remain > 1)
          console.log("Warning, remaining for session", sessionData[i].session_id, remain);
      } 

      // First, let's review the totals to make sure they add up. If not, adjust them into first entry.
      let total_check = 0;
      for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) 
        total_check += hour_entries[hour_index].wh??0;
      if (Math.abs(total_check - sessionData[i].energy_meter) > 1) {
        console.log("Adjusting data for session", sessionData[i].session_id, "missed to distribute energy", sessionData[i].energy_meter);
        const diff = sessionData[i].energy_meter - total_check;
        hour_entries[0].wh = (hour_entries[0].wh??0) + diff;
      } 

      // Now, let's add all entries to the session object. 
      sessionData[i].hourly_history = [];
      for (let hour_index = 0; hour_index < hour_entries.length; hour_index++) {
        sessionData[i].hourly_history.push(hour_entries[hour_index]);
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

    let end_date = startDate;  // Overwritten below

    // Daily itervals
    if (period == 'month' || period == 'lastmonth') {
      end_date = startDate.add(1, 'month');
      for (let date = startDate; date <= end_date; date = date.add(1, 'day')) {
        result.push({id: date.format('YYYY-MM-DD'), x: date.format('DD'), energy: 0, timestamp: date.unix()});
      }
    } else if (period == "48hours" || period == "last48hours") {
      end_date = startDate.add(48, 'hours');
      for (let date = startDate; date <= end_date; date = date.add(1, 'hour')) {
        result.push({id: date.format('YYYY-MM-DD-HH'), x: date.format('DD') + '\n' + date.format('HH'), energy: 0, timestamp: date.unix()});
      } 
    } else if (period == "year") {
      end_date = startDate.add(1, 'year');
      for (let date = startDate; date <= end_date; date = date.add(1, 'month')) {
        result.push({id: date.format('YYYY-MM'), x: date.format('MMM'), energy: 0, timestamp: date.unix()});
      } 
    } else if (period == "overall") {
      end_date = dayjs().add(1, 'year').startOf('year').startOf('day');
      for (let date = startDate; date <= end_date; date = date.add(1, 'year')) {
        result.push({id: date.format('YYYY'), x: date.format('YYYY'), energy: 0, timestamp: date.unix()});
      } 
    }

    // Then add energy from sessions. 
    const start_date_sec = startDate.toDate().getTime() / 1000.0;
    const end_date_sec = end_date.toDate().getTime() / 1000.0;
    for (let i = 0; i < sessionData.length; i++) {
      if (group != "(all)" && group != sessionData[i].group_id)
        continue;

      if (charger != "(all)" && charger != sessionData[i].charger_id)
        continue;

      // Is the session relevant at all, time-wise? If not, quickly move on...
      if (sessionData[i].end_time != null && sessionData[i].end_time < start_date_sec)  
        continue;
      if (sessionData[i].start_time > end_date_sec)  
        continue;

      // Iterate hourly charging entries and put into the right bucket(s)
      for (let ci = 0; ci < sessionData[i].hourly_history.length - 1; ci++) {
        const start = sessionData[i].hourly_history[ci].timestamp;
        const end = sessionData[i].hourly_history[ci + 1].timestamp;

        let found_bucket: boolean = false;
        for (let bucket_index = 0; bucket_index < result.length - 1; bucket_index++) {
          const bstart = result[bucket_index].timestamp;
          const bend = result[bucket_index + 1].timestamp;

          if (start >= bstart && end <= bend) {
            // Here!
            result[bucket_index].energy += ((sessionData[i].hourly_history[ci].wh??0) / 1000.0);
            found_bucket = true;
            break;
          }
        }
      }
    }

    // The last bucket is not filled. Let's remove it
    if (result.length > 0)
      result.pop();

    setDataset(result);
  }, 
  [period, group, charger, sessionData, sessionAugmented, startDate]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box>
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
          // @ts-expect-error Much easier this way
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
      <FormControl sx={{m: 1, minWidth: 100}}>
        <InputLabel id="select-charger">Charger</InputLabel>
        <Select
          labelId="select-charger"
          id="select-charger"
          value={charger}
          label="Charger"
          onChange={handleChargerChange}
          sx={{fontSize: '.9rem'}}
        >
          <MenuItem value={'(all)'} sx={{fontSize: '.9rem'}}>(all)</MenuItem>
          {(group != '(all)')?
            chargerData.filter((c) => c.group_id == (group)).map((ch) => (
              <MenuItem key={ch.charger_id} value={ch.charger_id} sx={{fontSize: '.9rem'}}>{ch.alias}</MenuItem>
            ))
          : ""}
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
