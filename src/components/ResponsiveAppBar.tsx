import * as React from 'react';
import { Link } from "react-router";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';

const pages = ['Dashboard', 'Chargers', 'Groups', 'Tags', 'Status', 'Sessions'];

function ResponsiveAppBar() {
  return (
    <React.Fragment>
    <AppBar position="fixed"  color="success">
      <Container maxWidth={false}>
        <Toolbar>
          <Box sx={{ flexGrow: 1}}>
            {pages.map((page) => (
              <Button
                key={page}
                sx={{ my: 2, color: 'white'}}
                component={Link}
                to={'/' + page}
              >
                {page}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
    <Toolbar />
    </React.Fragment>
      );
}
export default ResponsiveAppBar;
