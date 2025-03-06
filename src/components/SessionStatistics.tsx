import * as React from 'react';
import { useEffect, useState } from 'react';
import { SESSION, GROUP } from '../types/types';
import { BarChart } from '@mui/x-charts/BarChart';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

interface SessionStatisticsProps {
  sessionData: Array<SESSION>;
  groupData: Array<GROUP>;
};

type DATAENTRY = {
  timestamp: Date;
  x: string;
  energy: number;
};

const SessionStatistics: React.FC<SessionStatisticsProps> = ({sessionData, groupData}) => {
  const [period, setPeriod] = useState<string>('month');
  const [group, setGroup] = useState<string>('(all)');
  const [dataset, setDataset] = useState<Array<DATAENTRY>>([]);
  const [sessionAugmented, setSessionAugmented] = useState<boolean>(false);

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setPeriod(event.target.value as string);
  };

  const handleGroupChange = (event: SelectChangeEvent) => {
    setGroup(event.target.value as string);
  };

  function tomorrow(date: Date): Date {
    return new Date(date.getTime() + 60 * 60 * 24 * 1000);
  }

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
      for (let ci = 0; ci < sessionData[i].charging_history.length - 1; ci++) {
        // Work out how long this interval is.
        const seconds = sessionData[i].charging_history[ci + 1].timestamp - sessionData[i].charging_history[ci].timestamp;
        if (sessionData[i].charging_history[ci].usage != null)
          usage = sessionData[i].charging_history[ci].usage;
        else if (usage == null && sessionData[i].charging_history[ci].offered != null) {
          usage = sessionData[i].charging_history[ci].offered;
        }
        sessionData[i].charging_history[ci].wh = (usage ?? 0) * seconds / 3600.0;
        total_wh += sessionData[i].charging_history[ci].wh ?? 0;
      }
      if (sessionData[i].charging_history.length > 0)
        sessionData[i].charging_history[sessionData[i].charging_history.length - 1].wh = 0.0;

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
    if (!sessionAugmented)
      return;

    // Basic algorithm is to first create a number of time interval "buckets" based on the period setting.
    // Then next step is to distribute the charging entry wh values into those buckets (assuming of course
    // that the session is inside the desired overall period at all).

    // Common date stuff
    let start_date = new Date()
    let midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    midnight = tomorrow(midnight);
    console.log("Midnight (next)", midnight);

    // First prepare the array ("buckets") ..
    const result: Array<DATAENTRY> = [];
    if (period == 'month') {
      // First, quite a bit of work to get to midnight one months ago
      start_date = new Date(midnight);
      const month = start_date.getMonth();
      start_date.setMonth(start_date.getMonth() - 1);
      while (start_date.getMonth() === month)
        start_date.setDate(start_date.getDate() - 1);
      start_date = tomorrow(start_date);

      let next_date = null;    
      for (let date = start_date; date < midnight; date = next_date) {
        next_date = tomorrow(date);
        result.push({x: date.getDate().toString(), energy: 0, timestamp: date});
      }
    } else if (period == "7days") {
      start_date = new Date(midnight.getTime() - 24 * 7 * 60 * 60 * 1000);
      let next_date = null;    
      for (let date = start_date; date < midnight; date = next_date) {
        next_date = tomorrow(date);
        result.push({x: date.getDate().toString(), energy: 0, timestamp: date});
      } 
    } else if (period == "24hours") {
      let now = new Date();
      now.setMinutes(0, 0, 0);
      now = new Date(now.getTime() + 60 * 60 * 1000);
      start_date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      let next_date = null;    
      for (let date = start_date; date <= now; date = next_date) {
        next_date = new Date(date.getTime() + 60 * 60 * 1000);
        result.push({x: date.getHours().toString(), energy: 0, timestamp: date});
      } 
    }

    // Then add energy from sessions. 
    const start_date_sec = start_date.getTime() / 1000.0;
    for (let i = 0; i < sessionData.length; i++) {
      if (group != "(all)" && group != sessionData[i].group_id)
        continue;

      // Is the session relevant at all, time-wise? If not, quickly move on...
      if (sessionData[i].end_time < start_date_sec)  
        continue;

      // Iterate charging entries and put into the right bucket(s)
      for (let ci = 0; ci < sessionData[i].charging_history.length - 1; ci++) {
        const start = sessionData[i].charging_history[ci].date??new Date();
        const end = sessionData[i].charging_history[ci + 1].date??new Date();
        if (start == end)
          continue;   // Same second admin type entry - skip it.

        let remain = sessionData[i].charging_history[ci].wh??0;
        for (let bucket_index = 0; bucket_index < result.length - 1; bucket_index++) {
          const bstart = result[bucket_index].timestamp;
          const bend = result[bucket_index + 1].timestamp;

          // Done?
          if (bstart > end)
            break;

          // Check for no overlap/not at start yet.
          if (start > bend)
            continue;  

          // How much overlap
          const overlap_ms = Math.min(end.getTime(), bend.getTime()) - Math.max(start.getTime(), bstart.getTime());
          if (overlap_ms <= 0)
            continue;

          // Vs. length? - this determines the relative contribution
          const contrib_wh = (sessionData[i].charging_history[ci].wh??0) * (overlap_ms / (end.getTime() - start.getTime()));
          result[bucket_index].energy += contrib_wh / 1000.0; 
          remain -= contrib_wh;
        }
//        if (remain > 0)
//          console.log("Warning. Left remain", remain);
      }
    }
    setDataset(result);
  }, 
  [period, group, sessionData, sessionAugmented]);

  return (
    <Box>
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
        <InputLabel id="select-period">Period</InputLabel>
        <Select
          labelId="select-period"
          id="select-period"
          value={period}
          label="Period"
          onChange={handlePeriodChange}
          sx={{fontSize: '.9rem'}}
        >
          <MenuItem value={'24hours'} sx={{fontSize: '.9rem'}}>Last 24 hours</MenuItem>
          <MenuItem value={'7days'} sx={{fontSize: '.9rem'}}>Last 7 days</MenuItem>
          <MenuItem value={'month'} sx={{fontSize: '.9rem'}}>Last month</MenuItem>
        </Select>
      </FormControl>
      <BarChart
        dataset={dataset}
        xAxis={[{ scaleType: 'band', dataKey: 'x'}]}
        series={[{ dataKey: 'energy', label: "Energy (kWh)"}]}
        width={800}
        height={400}
      /> 
    </Box>

  );
};

export default SessionStatistics;
