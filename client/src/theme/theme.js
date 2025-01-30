import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6750A4',
    },
    secondary: {
      main: '#625B71',
    },
    background: {
      default: '#F6F5F8',
      paper: '#FFFFFF',
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
