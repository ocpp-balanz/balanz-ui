import * as React from "react";
import Container from "@mui/material/Container";
import { useEffect, useState } from "react";
import BalanzAPI from "../services/balanz_api";
import { SESSION, CHARGER } from "../types/types";
import Loader from "../common/Loader";
import SessionTable from "../components/SessionTable";

interface StatusProp {
  api: BalanzAPI;
}

const Sessions: React.FC<StatusProp> = ({ api }) => {
  const [sessionData, setSessionData] = useState<Array<SESSION>>([]);
  const [chargerData, setChargerData] = useState<Array<CHARGER>>([]);

  const getSessions = (api: BalanzAPI) => {
    const getSessions = async () => {
      const [ok, payload] = await api.call("GetSessions", {});
      if (ok == 3) {
        console.log("Succesfully retrieved sessions, #", payload.length);
        setSessionData(payload);
      } else {
        console.log("Error getting sessions");
      }
    };
    getSessions();
  };

  // Get Sessions
  useEffect(() => {
    getSessions(api);
  }, [api]);

  // Get chargers
  useEffect(() => {
    const getChargers = async () => {
      const [ok, payload] = await api.call("GetChargers", {});
      if (ok == 3) {
        setChargerData(payload);
      } else {
        console.log("Error getting chargers");
      }
    };
    getChargers();
  }, [api]);

  return sessionData.length == 0 ? (
    <Loader />
  ) : (
    <Container maxWidth={false} sx={{ mt: 2 }}>
      <SessionTable
        api={api}
        sessionData={sessionData}
        chargerData={chargerData}
      />
    </Container>
  );
};

export default Sessions;
