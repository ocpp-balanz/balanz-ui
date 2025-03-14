import * as React from 'react';
import BalanzAPI from '../services/balanz_api';
import ChargerTable from '../components/ChargerTable';
import Container from '@mui/material/Container';

interface ChargersProp {
  api: BalanzAPI;
  userType: string;
}

const Chargers: React.FC<ChargersProp> = ({ api, userType }) => {
  return (
    <React.Fragment>
      <Container  maxWidth={false} sx={{ mt: 2 }}>
        <ChargerTable api={api} userType={userType}/>
      </Container>
    </React.Fragment>
  );
};

export default Chargers;
