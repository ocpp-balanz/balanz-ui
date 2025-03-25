import * as React from 'react';
import { useEffect, useState } from 'react';
import { SESSION, GROUP, CHARGER } from '../types/types';
import { BarChart } from '@mui/x-charts/BarChart';
import Box from '@mui/material/Box';
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
import { augment_session_data} from '../common/SessionSupport';
import { price_session_data, price_currency} from '../common/EPricing';
import { axisClasses } from '@mui/x-charts/ChartsAxis';

const PRICE_HEADER = 'Price (' + price_currency() + ')';

interface SessionStatisticsProps {
  sessionData: Array<SESSION>;
  groupData: Array<GROUP>;
  chargerData: Array<CHARGER>;
};

declare module '@mui/x-data-grid' {
  interface FooterPropsOverrides {
    total: number;
    totalPrice: number;
  }
}

type DATAENTRY = {
  id: string;
  timestamp: number;
  x: string;
  energy: number;
  price: number;
};

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
  const [totalPrice, setTotalPrice] = useState<number>(0);
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
    { field: 'energy', headerName: 'Energy (kWh)', type: 'number', valueGetter: (value: number) => {return value.toFixed(3)}, flex: 2},
    { field: 'price', headerName: PRICE_HEADER, type: 'number', valueGetter: (value: number) => {return value.toFixed(2)}, flex: 2},
    { field: 'avprice', headerName: "Average Price", type: 'number',       
      renderCell: (params) => {
        if (params.row.energy == 0) 
          return (<></>);
        else
          return (<>{(params.row.price / params.row.energy).toFixed(2)}</>);
      },
      flex: 2}
  ];
  
  function CustomFooterComponent(
    props: NonNullable<GridSlotsComponentsProps['footer']>,
  ) {
    return (
      <>
        <Divider />
        <Box sx={{ mx: 1.1, my: 1, display: "flex"}}>
          <Box flex={1} alignContent="left"><b>Total</b></Box>
          <Box flex={1} alignContent="right"><b>{props.total?.toFixed(3)}</b></Box>
          <Box flex={1} alignContent="right"><b>{props.totalPrice?.toFixed(2)}</b></Box>
          <Box flex={1} alignContent="right"><b>{((props.totalPrice??0) / (props.total??1)).toFixed(2)}</b></Box>
        </Box>
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
    let sum_price = 0;
    for (let i = 0; i < dataset.length; i++) {
      sum += dataset[i].energy;
      sum_price += dataset[i].price;
    }
    setTotal(sum);
    setTotalPrice(sum_price);
  }, 
  [dataset]);

  // Initial augmentation of sessionData. For each historic CHARGING_ENTRY element,
  // a net Wh usage value will be added.
  useEffect(() => {
    augment_session_data(sessionData);
    price_session_data(sessionData, chargerData)
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
        result.push({id: date.format('YYYY-MM-DD'), x: date.format('DD'), energy: 0, timestamp: date.unix(), price: 0});
      }
    } else if (period == "48hours" || period == "last48hours") {
      end_date = startDate.add(48, 'hours');
      for (let date = startDate; date <= end_date; date = date.add(1, 'hour')) {
        result.push({id: date.format('YYYY-MM-DD-HH'), x: date.format('DD') + '\n' + date.format('HH'), energy: 0, timestamp: date.unix(), price: 0});
      } 
    } else if (period == "year") {
      end_date = startDate.add(1, 'year');
      for (let date = startDate; date <= end_date; date = date.add(1, 'month')) {
        result.push({id: date.format('YYYY-MM'), x: date.format('MMM'), energy: 0, timestamp: date.unix(), price: 0});
      } 
    } else if (period == "overall") {
      end_date = dayjs().add(1, 'year').startOf('year').startOf('day');
      for (let date = startDate; date <= end_date; date = date.add(1, 'year')) {
        result.push({id: date.format('YYYY'), x: date.format('YYYY'), energy: 0, timestamp: date.unix(), price: 0});
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

        for (let bucket_index = 0; bucket_index < result.length - 1; bucket_index++) {
          const bstart = result[bucket_index].timestamp;
          const bend = result[bucket_index + 1].timestamp;

          if (start >= bstart && end <= bend) {
            // Here!
            result[bucket_index].energy += ((sessionData[i].hourly_history[ci].wh??0) / 1000.0);
            result[bucket_index].price += ((sessionData[i].hourly_history[ci].price??0));
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
        yAxis={[
          { id: 'energyAxis', scaleType: 'linear', label: "kWh" },
          { id: 'priceAxis', scaleType: 'linear', label: price_currency() }
        ]}
        series={[
          { dataKey: 'energy', label: "Energy (kWh)", yAxisId: 'energyAxis'},
          { dataKey: 'price', label: PRICE_HEADER, yAxisId: 'priceAxis'}
        ]}
        leftAxis="energyAxis"
        rightAxis="priceAxis"
        grid={{ horizontal: true }}
        height={500}
        margin={{ left: 70, right: 70 }}
        sx={{
          [`.${axisClasses.left} .${axisClasses.label}`]: {
            transform: 'translate(-10px, 0)',
          },
          [`.${axisClasses.right} .${axisClasses.label}`]: {
            transform: 'translate(+10px, 0)',
          },
        }}
      />
      <DataGrid 
        hideFooterPagination={true}
        rows={dataset}
        columns={columns}
        density="compact"
        sx={{fontSize: '.8rem', width:450}}
        slots={{ toolbar: CustomToolbar, footer: CustomFooterComponent }}
        slotProps={{
          footer: { total, totalPrice}
        }}
      />
    </Box>
    </LocalizationProvider>

  );
};

export default SessionStatistics;
