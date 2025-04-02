import { Box } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';


const NoConnection = () => {
    return (

      <Box>
        <ErrorIcon sx={{ m:1, scale: '1' }} style={{ color: '#FF0000', fontSize: '5rem' }}/>
        <h1>No Connection to Server</h1>
      </Box>
    );
  };
  
export default NoConnection;
