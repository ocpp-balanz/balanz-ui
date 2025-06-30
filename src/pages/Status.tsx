import * as React from "react";
import Container from "@mui/material/Container";
import { useEffect, useState } from "react";
import BalanzAPI from "../services/balanz_api";
import { GROUP } from "../types/types";
import Loader from "../common/Loader";
import ChargingStatusTable from "../components/ChargingStatusTable";

interface StatusProp {
  api: BalanzAPI;
  userType: string;
}

const Status: React.FC<StatusProp> = ({ api, userType }) => {
  const [groupData, setGroupData] = useState<Array<GROUP>>([]);

  const getGroups = (api: BalanzAPI) => {
    const getGroups = async () => {
      const [ok, payload] = await api.call("GetGroups", {
        charger_details: true,
      });
      if (ok == 3) {
        console.log("Succesfully retrieved groups, #", payload.length);
        setGroupData(payload);
      } else {
        console.log("Error getting groups");
      }
    };
    getGroups();
  };

  // Get groups
  useEffect(() => {
    getGroups(api);

    const interval = setInterval(() => {
      getGroups(api);
    }, 30000);

    return () => clearInterval(interval);
  }, [api]);

  return groupData.length == 0 ? (
    <Loader />
  ) : (
    <Container maxWidth={false} sx={{ mt: 0 }}>
      {groupData.map((group) => (
        <ChargingStatusTable
          api={api}
          key={group.group_id}
          group={group}
          chargerData={group.chargers}
          userType={userType}
        />
      ))}
    </Container>
  );
};

export default Status;
