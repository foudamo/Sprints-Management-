import { createTheme } from '@mui/material/styles';

// MD3 spacing system
const spacing = {
  xs: '4px',    // 4dp
  sm: '8px',    // 8dp
  md: '16px',   // 16dp
  lg: '24px',   // 24dp
  xl: '32px',   // 32dp
  xxl: '40px',  // 40dp
};

// MD3 elevation values
const elevation = {
  level0: 'none',
  level1: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
  level2: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  level3: '0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
  level4: '0px 2px 3px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
  level5: '0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
};

const theme = createTheme({
  spacing: 8, // Base spacing unit in pixels
  palette: {
    primary: {
      main: '#6750A4',
      light: '#D0BCFF',
      dark: '#381E72',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#625B71',
      light: '#CCC2DC',
      dark: '#332D41',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#B3261E',
      light: '#F2B8B5',
      dark: '#601410',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFBFE',
      paper: '#FFFFFF',
    },
    text: {
      primary: 'rgba(28, 27, 31, 0.87)',  // Updated for better readability
      secondary: 'rgba(28, 27, 31, 0.6)',
    },
  },
  typography: {
    fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
    // Display Large
    h1: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '57px',
      lineHeight: '64px',
      letterSpacing: '-0.25px',
      fontWeight: 400,
    },
    // Display Medium
    h2: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '45px',
      lineHeight: '52px',
      letterSpacing: '0px',
      fontWeight: 400,
    },
    // Display Small
    h3: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '36px',
      lineHeight: '44px',
      letterSpacing: '0px',
      fontWeight: 400,
    },
    // Headline Large
    h4: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '32px',
      lineHeight: '40px',
      letterSpacing: '0px',
      fontWeight: 400,
    },
    // Headline Medium
    h5: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '28px',
      lineHeight: '36px',
      letterSpacing: '0px',
      fontWeight: 400,
    },
    // Headline Small
    h6: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '24px',
      lineHeight: '32px',
      letterSpacing: '0px',
      fontWeight: 400,
    },
    // Body Large
    body1: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '16px',
      lineHeight: '24px',
      letterSpacing: '0.5px',
      fontWeight: 400,
    },
    // Body Medium
    body2: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '14px',
      lineHeight: '20px',
      letterSpacing: '0.25px',
      fontWeight: 400,
    },
    // Label Large
    button: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '14px',
      lineHeight: '20px',
      letterSpacing: '0.1px',
      fontWeight: 500,
      textTransform: 'none',
    },
    // Label Medium
    caption: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '12px',
      lineHeight: '16px',
      letterSpacing: '0.5px',
      fontWeight: 500,
    },
    // Label Small
    overline: {
      fontFamily: '"Roboto Flex", "Roboto", system-ui, sans-serif',
      fontSize: '11px',
      lineHeight: '16px',
      letterSpacing: '0.5px',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '100px',
          padding: '10px 24px',
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: elevation.level1,
          '&:hover': {
            boxShadow: elevation.level2,
          },
          '&:active': {
            boxShadow: elevation.level1,
          },
        },
        outlined: {
          padding: '9px 23px', // Accounting for border
        },
        text: {
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          padding: spacing.md,
          boxShadow: elevation.level1,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: elevation.level0,
          padding: `${spacing.xs} ${spacing.md}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          padding: `${spacing.sm} ${spacing.md} !important`,
          '@media (min-width: 600px)': {
            padding: `${spacing.sm} ${spacing.md} !important`,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '28px',
          padding: spacing.md,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: spacing.md,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: spacing.md,
          paddingTop: `${spacing.md} !important`,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: spacing.md,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.87)',
            },
            '&.Mui-focused fieldset': {
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '16px',
          lineHeight: '24px',
          letterSpacing: '0.5px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          height: '32px',
          '&.MuiChip-sizeSmall': {
            height: '24px',
          },
        },
        label: {
          padding: `0 ${spacing.sm}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: '4px',
          padding: `${spacing.xs} ${spacing.sm}`,
          fontSize: '12px',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          margin: `${spacing.md} 0`,
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: `${spacing.xs} 0`,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          padding: `${spacing.sm} ${spacing.md}`,
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '40px',
        },
      },
    },
  },
});

export default theme;
