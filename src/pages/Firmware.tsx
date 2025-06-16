import * as React from 'react';

import BalanzAPI from '../services/balanz_api';
import FirmwareTable from '../components/FirmwareTable';
import Container from '@mui/material/Container';

interface FirmwareProp {
  api: BalanzAPI;
}

const Users: React.FC<FirmwareProp> = ({ api }) => {

  return (
    <React.Fragment>
      <Container maxWidth={false} disableGutters sx={{ mt: 2 }}>
        <FirmwareTable api={api} />
      </Container>
    </React.Fragment>
  );
};

export default Users;
