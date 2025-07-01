import * as React from "react";
import BalanzAPI from "../services/balanz_api";
import GroupTable from "../components/GroupTable";
import Container from "@mui/material/Container";

interface GroupsProp {
  api: BalanzAPI;
}

const Groups: React.FC<GroupsProp> = ({ api }) => {
  return (
    <React.Fragment>
      <Container maxWidth={false} disableGutters sx={{ mt: 2 }}>
        <GroupTable api={api} />
      </Container>
    </React.Fragment>
  );
};

export default Groups;
