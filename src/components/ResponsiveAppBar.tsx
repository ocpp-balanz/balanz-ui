import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link } from "react-router";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';

interface ResponsiveAppBarProps {
  userType: string;
};

const ResponsiveAppBar: React.FC<ResponsiveAppBarProps> = ({ userType }) => {
  const [pages, setPages] = useState<Array<string>>([]);

  useEffect(() => {
    if (userType == "Status" || userType == "SessionPriority")
      setPages(['Status']);
    else
      setPages(['Status', 'Sessions', 'Statistics', 'Chargers', 'Groups', 'Tags', 'Users']);
}, [userType]);

  return (
    <React.Fragment>
    <AppBar position="fixed">
      <Container maxWidth={false}>
        <Toolbar>
          <Box >
            {pages.map((page) => (
              <Button
                key={page}
                sx={{ my: 1, color: 'white', font: '.9em'}}
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
