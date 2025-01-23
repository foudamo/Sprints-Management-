import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  AppBar,
  Toolbar,
  LinearProgress,
  Paper,
  Divider,
  ThemeProvider,
  CssBaseline,
  Button,
  IconButton
} from '@mui/material';
import {
  ViewColumn as ViewColumnIcon,
  CalendarMonth as CalendarMonthIcon
} from '@mui/icons-material';
import TaskColumn from './components/TaskColumn';
import TeamSettings from './components/TeamSettings';
import TextInput from './components/TextInput';
import Calendar from './components/Calendar';
import Footer from './components/Footer';
import { io } from 'socket.io-client';
import logoIcon from './assets/logo-icon.svg';
import logoText from './assets/logo-text.svg';
import theme from './theme/theme';

function App() {
  const [members, setMembers] = useState({});
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [viewMode, setViewMode] = useState('columns');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ stage: 'Ready', progress: 0 });
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setError(null);
      newSocket.emit('get-team-members');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Unable to connect to server. Please try again later.');
    });

    newSocket.on('team-members', (data) => {
      console.log('Received team members:', data);
      setTeamMembers(data || []);
    });

    newSocket.on('parsing-complete', (data) => {
      console.log('Received parsed tasks:', data);
      setMembers(data);
      setError(null);
      setLoading(false);
    });

    newSocket.on('parsing-error', (error) => {
      console.error('Parsing error:', error);
      setError(error.message);
      setLoading(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setError('Lost connection to server. Attempting to reconnect...');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const handleTaskUpdate = (memberName, tasks) => {
    if (!socket) return;

    const updatedMembers = { ...members };
    updatedMembers[memberName] = {
      name: memberName,
      tasks: tasks.map(task => ({
        ...task,
        assignedTo: memberName
      }))
    };
    
    setMembers(updatedMembers);
    socket.emit('update-tasks', updatedMembers);
  };

  const handleParsingComplete = (parsedData) => {
    console.log('Setting parsed data:', parsedData);
    setMembers(parsedData);
  };

  const handleTeamMembersUpdate = (updatedMembers) => {
    if (!socket) return;
    socket.emit('update-team-members', updatedMembers);
  };

  const getAllTasks = () => {
    return Object.values(members).reduce((acc, member) => {
      return acc.concat(member.tasks.map(task => ({
        ...task,
        assignedTo: member.name
      })));
    }, []);
  };

  const getFilteredMembers = () => {
    if (!members) return [];
    
    return Object.values(members).map(member => ({
      ...member,
      tasks: member.tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        const selected = new Date(selectedDate);
        return taskDate.getFullYear() === selected.getFullYear() &&
               taskDate.getMonth() === selected.getMonth() &&
               taskDate.getDate() === selected.getDate();
      })
    }));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}>
      <AppBar 
        position="static" 
        sx={{ 
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: 'none'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src={logoIcon} alt="Logo Icon" style={{ height: 32, marginRight: 8 }} />
            <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24 }} />
            <img src={logoText} alt="Logo Text" style={{ height: 20 }} />
            <Typography variant="h6" sx={{ ml: 2, color: 'text.primary', fontWeight: 500 }}>
              Sprints Task Manager
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => setViewMode('calendar')}
              sx={{
                borderRadius: 100,
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                p: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'divider'
                }
              }}
            >
              <CalendarMonthIcon />
            </IconButton>
            <TeamSettings 
              teamMembers={teamMembers} 
              onUpdate={handleTeamMembersUpdate} 
            />
          </Box>
        </Toolbar>
      </AppBar>

      {loading && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ textAlign: 'center', py: 1 }}>
            {progress.stage}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ 
        flexGrow: 1, 
        p: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {viewMode === 'columns' ? (
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 2,
            height: '100%'
          }}>
            {getFilteredMembers().map(member => (
              <Box 
                key={member.name}
                sx={{ 
                  minWidth: '300px',
                  maxWidth: '300px'
                }}
                role="listitem"
              >
                <TaskColumn
                  member={member}
                  onUpdate={(tasks) => handleTaskUpdate(member.name, tasks)}
                />
              </Box>
            ))}
          </Box>
        ) : (
          <Paper 
            elevation={1}
            sx={{ 
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              mx: 'auto',
              mb: 2,
              borderRadius: 1,
              bgcolor: 'background.paper'
            }}
          >
            <Calendar
              members={Object.values(members).map(member => member)}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              socket={socket}
              viewMode={viewMode}
              onViewModeChange={(newView) => setViewMode(newView)}
              handleParsingComplete={handleParsingComplete}
            />
          </Paper>
        )}
      </Box>
      <Footer />
    </Box>
    </ThemeProvider>
  );
}

export default App;
