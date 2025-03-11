import * as React from 'react';
import Box from '@mui/material/Box';
import { useEffect, useState } from 'react';
import BalanzAPI from '../services/balanz_api';
import { GROUP, SESSION } from '../types/types';
import SessionStatistics from '../components/SessionStatistics';

interface StatisticsProp {
  api: BalanzAPI;
}

const Statistics: React.FC<StatisticsProp> = ({ api }) => {
  const [groupData, setGroupData] = useState<Array<GROUP>>([]);
  const [sessionData, setSessionData] = useState<Array<SESSION>>([]);
  
  const getSessions = (api: BalanzAPI) => {
    const getSessions = async() => {
      const [ok, payload] = await api.call("GetSessions", {"include_live": "true"});
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

  return (
    <Box sx={{ mt: 2 }}>
      <SessionStatistics groupData={groupData} sessionData={sessionData} />
    </Box>
  );
};

export default Statistics;
