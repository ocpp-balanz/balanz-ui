import * as React from 'react';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import { useEffect, useState } from 'react';
import BalanzAPI from '../services/balanz_api';
import { CHARGER, GROUP, TAG, SESSION } from '../types/types';
import EvStationIcon from '@mui/icons-material/EvStation';
import { Stack } from '@mui/material';
import { Key } from '@mui/icons-material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import SessionStatistics from '../components/SessionStatistics';

interface DashboardProp {
  api: BalanzAPI;
}

const Dashboard: React.FC<DashboardProp> = ({ api }) => {
  const [chargerData, setChargerData] = useState<Array<CHARGER>>([]);
  const [groupData, setGroupData] = useState<Array<GROUP>>([]);
  const [tagData, setTagData] = useState<Array<TAG>>([]);
  const [sessionData, setSessionData] = useState<Array<SESSION>>([]);
  
  const getSessions = (api: BalanzAPI) => {
    const getSessions = async() => {
      const [ok, payload] = await api.call("GetSessions", {});
      if (ok == 3) {
        console.log("Succesfully retrieved sessions, #", payload.length);
        setSessionData(payload);
      } else {
        console.log("Error getting sessions");
      }
    }
    getSessions();
  }

  // Get Sessions
  useEffect(() => {
    getSessions(api);
  }, 
  [api]);
  
  // Get chargers
  useEffect(() => {
    const getChargers = async() => {
      const [ok, payload] = await api.call("GetChargers", {});
      if (ok == 3) {
        setChargerData(payload);
      } else {
        console.log("Error getting chargers");
      }
    }
    getChargers();
  }, 
  [api]);

  // Get groups
  useEffect(() => {
    const getGroups = async() => {
      const [ok, payload] = await api.call("GetGroups", {});
      if (ok == 3) {
        setGroupData(payload);
      } else {
        console.log("Error getting groups");
      }
    }
    getGroups();
  }, 
  [api]);

  // Get tags
  useEffect(() => {
    const getTags = async() => {
      const [ok, payload] = await api.call("GetTags", {});
      if (ok == 3) {
        setTagData(payload);
      } else {
        console.log("Error getting tags");
      }
    }
    getTags();
  }, 
  [api]);

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        <Grid size={1}>
          <Stack alignItems="center" direction="row" gap={2}>
            <EvStationIcon color='info' sx={{ scale: '1.5' }}/> {chargerData.length}
          </Stack>
        </Grid>
        <Grid size={1}>
          <Stack alignItems="center" direction="row" gap={2}>
            <LocationCityIcon color='info' sx={{ scale: '1.5' }}/> {groupData.length}
          </Stack>
        </Grid>
        <Grid size={1}>
          <Stack alignItems="center" direction="row" gap={2}>
            <Key color='info' sx={{ scale: '1.5' }}/> {tagData.length}
          </Stack>
        </Grid>
        <Grid size={10}>
          <SessionStatistics groupData={groupData} sessionData={sessionData} />
        </Grid>
      </Grid>    
    </Box>
  );
};

export default Dashboard;
