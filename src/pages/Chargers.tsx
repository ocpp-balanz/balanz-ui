import * as React from 'react';
import BalanzAPI from '../services/balanz_api';
import ChargerTable from '../components/ChargerTable';
import Container from '@mui/material/Container';

interface ChargersProp {
  api: BalanzAPI;
}

const Chargers: React.FC<ChargersProp> = ({ api }) => {
  return (
    <React.Fragment>
      <Container  maxWidth={false} sx={{ mt: 2 }}>
        <ChargerTable api={api}/>
      </Container>
    </React.Fragment>
  );
};

export default Chargers;
