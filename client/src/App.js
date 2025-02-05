import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogActions, 
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  ListItemText,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import Calendar from './components/Calendar';
import DayView from './components/DayView';
import TeamMembers from './components/TeamMembers';
import ReportDialog from './components/ReportDialog';
import Footer from './components/Footer';
import theme from './theme/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon from '@mui/icons-material/Group';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-url.com' 
  : 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [showDayView, setShowDayView] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());  
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [memberInput, setMemberInput] = useState('');

  useEffect(() => {
    // First try to fetch members via HTTP
    fetch('http://localhost:3001/api/members')
      .then(response => response.json())
      .then(data => {
        console.log('Fetched members via HTTP:', data);
        setMembers(data);
      })
      .catch(error => console.error('Error fetching members:', error));

    // Then fetch tasks via HTTP
    fetch('http://localhost:3001/api/tasks')
      .then(response => response.json())
      .then(data => {
        console.log('Fetched tasks via HTTP:', data);
        setTasks(data);
      })
      .catch(error => console.error('Error fetching tasks:', error));

    // Then set up WebSocket connection
    console.log('Initializing socket connection...');
    const newSocket = io('http://localhost:3001', {
      transports: ['polling', 'websocket'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      withCredentials: false,
      forceNew: true,
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server with ID:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
      setSocket(newSocket);

      // Fetch latest data on reconnect
      newSocket.emit('request_initial_data');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('members', (data) => {
      console.log('Received members via WebSocket:', data);
      if (Array.isArray(data)) {
        setMembers(data);
      }
    });

    newSocket.on('tasks', (data) => {
      console.log('Received tasks via WebSocket:', data);
      if (Array.isArray(data)) {
        setTasks(data);
      }
    });

    newSocket.on('task_added', (task) => {
      console.log('Task added:', task);
      setTasks(prevTasks => {
        // Remove any existing task with the same ID
        const filteredTasks = prevTasks.filter(t => t.id !== task.id);
        // Add the new task
        return [...filteredTasks, task];
      });
    });

    newSocket.on('task_updated', (task) => {
      console.log('Task updated:', task);
      setTasks(prevTasks => {
        // Replace the updated task
        return prevTasks.map(t => t.id === task.id ? task : t);
      });
    });

    newSocket.on('task_deleted', (taskId) => {
      console.log('Task deleted:', taskId);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    });

    return () => {
      console.log('App unmounting, cleaning up socket...');
      if (newSocket) {
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('connect_error');
        newSocket.off('members');
        newSocket.off('tasks');
        newSocket.off('task_added');
        newSocket.off('task_updated');
        newSocket.off('task_deleted');
        newSocket.close();
      }
    };
  }, []);

  const addMember = (member) => {
    console.log('Adding new member:', member);
    if (socket && socket.connected) {
      socket.emit('add_member', member);
    } else {
      console.error('Socket not connected');
      alert('Not connected to server. Please try again.');
    }
  };

  const addTask = (task) => {
    console.log('Adding new task:', task);
    if (socket && socket.connected) {
      socket.emit('add_task', task);
    } else {
      console.error('Socket not connected');
      alert('Not connected to server. Please try again.');
    }
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setShowDayView(true);
  };

  const handleCloseDayView = () => {
    setShowDayView(false);
    setSelectedDate(null);
  };

  const handleMemberSubmit = (e) => {
    e.preventDefault();
    const memberName = memberInput.trim();
    if (!memberName) return;

    const nicknames = memberName.split(' ').filter(n => n);
    if (memberName.includes(' ')) {
      nicknames.push(memberName.split(' ')[0]); // First name
      nicknames.push(memberName.split(' ').slice(-1)[0]); // Last name
      nicknames.push(memberName.split(' ').map(n => n[0]).join('')); // Initials
    }

    addMember({
      name: memberName,
      role: 'Developer',
      nicknames: Array.from(new Set(nicknames)) // Remove duplicates
    });
    setMemberInput('');
  };

  const handleMemberUpdate = (memberId, updates) => {
    if (!socket || !socket.connected) {
      console.error('Socket not connected');
      alert('Not connected to server. Please try again.');
      return;
    }

    const member = members.find(m => m.id === memberId);
    if (!member) {
      console.error('Member not found:', memberId);
      return;
    }

    // Generate nicknames if not provided
    if (!updates.nicknames) {
      const nicknames = updates.name.split(' ').filter(n => n);
      if (updates.name.includes(' ')) {
        nicknames.push(updates.name.split(' ')[0]); // First name
        nicknames.push(updates.name.split(' ').slice(-1)[0]); // Last name
        nicknames.push(updates.name.split(' ').map(n => n[0]).join('')); // Initials
      }
      updates.nicknames = Array.from(new Set(nicknames)); // Remove duplicates
    }

    socket.emit('update_member', {
      ...member,
      ...updates
    });
  };

  const handleMemberDelete = (memberId) => {
    if (!socket || !socket.connected) {
      console.error('Socket not connected');
      alert('Not connected to server. Please try again.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this team member?')) {
      socket.emit('delete_member', memberId);
    }
  };

  const findMemberByNameOrNickname = (nameOrNickname) => {
    return members.find(member => 
      member.name.toLowerCase() === nameOrNickname.toLowerCase() ||
      (member.nicknames && member.nicknames.some(nick => 
        nick.toLowerCase() === nameOrNickname.toLowerCase()
      ))
    );
  };

  const renderMemberName = (member) => {
    if (!member) return 'Unknown';
    const nicknames = member.nicknames && member.nicknames.length > 0
      ? ` (${member.nicknames.join(', ')})`
      : '';
    return `${member.name}${nicknames}`;
  };

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar position="static" sx={{ backgroundColor: '#6750A4' }}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Sprints Task Manager
              </Typography>
              <IconButton color="inherit" onClick={() => setShowTeamMembers(true)}>
                <PeopleIcon />
              </IconButton>
              <IconButton 
                color="inherit" 
                onClick={() => setShowReportDialog(true)}
                sx={{ ml: 1 }}
              >
                <SettingsIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          <Container sx={{ mt: 3, mb: 3, flexGrow: 1 }}>
            <Calendar 
              tasks={tasks}
              socket={socket}
              onDayClick={handleDayClick}
            />
          </Container>

          <Dialog 
            open={showTeamMembers} 
            onClose={() => setShowTeamMembers(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Team Members</DialogTitle>
            <DialogContent>
              <TeamMembers 
                socket={socket} 
                members={members} 
                onMemberSubmit={handleMemberSubmit} 
                onMemberUpdate={handleMemberUpdate} 
                onMemberDelete={handleMemberDelete} 
                memberInput={memberInput} 
                setMemberInput={setMemberInput} 
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowTeamMembers(false)}>Close</Button>
            </DialogActions>
          </Dialog>

          <Dialog 
            open={showDayView} 
            onClose={handleCloseDayView} 
            maxWidth="lg" 
            fullWidth
            PaperProps={{
              sx: {
                minHeight: '80vh',
                maxHeight: '90vh'
              }
            }}
          >
            <DayView
              date={selectedDate}
              tasks={tasks}
              members={members}
              socket={socket}
              onClose={handleCloseDayView}
            />
          </Dialog>

          <ReportDialog
            open={showReportDialog}
            onClose={() => setShowReportDialog(false)}
            socket={socket}
            tasks={tasks}
            members={members}
          />

          <Footer />
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
