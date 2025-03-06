import * as React from 'react';

import BalanzAPI from '../services/balanz_api';
import TagTable from '../components/TagTable';
import Container from '@mui/material/Container';

interface TagsProp {
  api: BalanzAPI;
}

const Tags: React.FC<TagsProp> = ({ api }) => {

  return (
    <React.Fragment>
      <Container maxWidth={false} disableGutters sx={{ mt: 2 }}>
        <TagTable api={api} />
      </Container>
    </React.Fragment>
  );
};

export default Tags;
