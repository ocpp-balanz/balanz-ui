import * as React from 'react';

import BalanzAPI from '../services/balanz_api';
import UserTable from '../components/UserTable';
import Container from '@mui/material/Container';

interface UsersProp {
  api: BalanzAPI;
}

const Users: React.FC<UsersProp> = ({ api }) => {

  return (
    <React.Fragment>
      <Container maxWidth={false} disableGutters sx={{ mt: 2 }}>
        <UserTable api={api} />
      </Container>
    </React.Fragment>
  );
};

export default Users;
