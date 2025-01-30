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
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
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
  ? process.env.REACT_APP_BACKEND_URL 
  : 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [showDayView, setShowDayView] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showParseDialog, setShowParseDialog] = useState(false);
  const [parseText, setParseText] = useState('');
  const [parseDateValue, setParseDateValue] = useState(new Date());
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    console.log('Initializing socket connection to:', BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('getTasks');
      newSocket.emit('getTeamMembers');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    newSocket.on('tasksUpdated', (updatedTasks) => {
      console.log('Received tasks:', updatedTasks);
      setTasks(updatedTasks);
    });

    newSocket.on('teamMembersUpdated', (updatedMembers) => {
      console.log('Received members:', updatedMembers);
      setMembers(updatedMembers);
    });

    newSocket.on('taskAdded', (task) => {
      console.log('Task added:', task);
      setTasks(prevTasks => [...prevTasks, task]);
    });

    newSocket.on('taskUpdated', (updatedTask) => {
      console.log('Task updated:', updatedTask);
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );
    });

    newSocket.on('taskDeleted', (taskId) => {
      console.log('Task deleted:', taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    });

    newSocket.on('memberAdded', (member) => {
      console.log('Member added:', member);
      setMembers(prevMembers => [...prevMembers, member]);
    });

    newSocket.on('memberDeleted', (memberId) => {
      console.log('Member deleted:', memberId);
      setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
    });

    return () => {
      if (newSocket) {
        console.log('Disconnecting socket');
        newSocket.disconnect();
      }
    };
  }, []);

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setShowDayView(true);
  };

  const handleCloseDayView = () => {
    setShowDayView(false);
    setSelectedDate(null);
  };

  const cleanTaskDescription = (description) => {
    return description
      // Remove timestamps in various formats
      .replace(/\(\d{2}:\d{2}(?::\d{2})?\)/g, '')
      .replace(/\(\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\)/g, '')
      .replace(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g, '')
      // Remove standalone timestamps
      .replace(/\b\d{2}:\d{2}\b/g, '')
      // Remove numbers in parentheses
      .replace(/\(\d+(?::\d+)?\)/g, '')
      // Remove standalone numbers
      .replace(/^\s*-?\s*\d+\s*$/, '')
      // Remove trailing numbers
      .replace(/\s+-\s*\d+\s*$/, '')
      // Clean up any remaining artifacts
      .replace(/\s+-\s*$/, '')
      .replace(/^\s*-\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleParseText = () => {
    console.log('handleParseText called');
    if (!parseText.trim() || !parseDateValue) return;

    const lines = parseText.split('\n');
    const parsedTasks = [];
    let currentAssignee = null;

    // Create a map of member names and their variations
    const memberNameMap = new Map();
    members.forEach(member => {
      const fullName = member.name.toLowerCase();
      const nameParts = fullName.split(' ');
      
      // Store full name
      memberNameMap.set(fullName, member.name);
      
      // Store first name
      if (nameParts[0]) {
        memberNameMap.set(nameParts[0], member.name);
      }
      
      // Store last name
      if (nameParts.length > 1) {
        memberNameMap.set(nameParts[nameParts.length - 1], member.name);
      }
    });

    // Function to find member name in text
    const findMemberInText = (text) => {
      const normalizedText = text.toLowerCase();
      
      // First try to match full names (longer matches first)
      const fullNameMatch = Array.from(memberNameMap.entries())
        .filter(([key]) => key.includes(' '))
        .sort((a, b) => b[0].length - a[0].length)
        .find(([key]) => normalizedText.includes(key));
      
      if (fullNameMatch) return fullNameMatch[1];

      // Then try to match single names with word boundaries
      const singleNameMatch = Array.from(memberNameMap.entries())
        .filter(([key]) => !key.includes(' '))
        .find(([key]) => {
          const regex = new RegExp(`\\b${key}\\b`, 'i');
          return regex.test(normalizedText);
        });

      return singleNameMatch ? singleNameMatch[1] : null;
    };

    // Process text in chunks to maintain context
    let currentChunk = [];
    let processingNotes = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for section headers
      if (line.toLowerCase().includes('notes:')) {
        processingNotes = true;
        continue;
      }

      // Try to find member name in the line
      const memberName = findMemberInText(line);
      if (memberName) {
        // Process any accumulated chunk before starting new member's section
        if (currentChunk.length > 0 && currentAssignee) {
          const taskText = currentChunk.join(' ');
          const tasks = extractTasksFromText(taskText, currentAssignee);
          parsedTasks.push(...tasks);
        }
        
        currentAssignee = memberName;
        currentChunk = [];
        continue;
      }

      // Add line to current chunk
      if (currentAssignee) {
        currentChunk.push(line);
      }
    }

    // Process final chunk
    if (currentChunk.length > 0 && currentAssignee) {
      const taskText = currentChunk.join(' ');
      const tasks = extractTasksFromText(taskText, currentAssignee);
      parsedTasks.push(...tasks);
    }

    // Helper function to extract tasks from text
    function extractTasksFromText(text, assignee) {
      const tasks = [];
      
      // Split into potential task segments
      const segments = text.split(/(?=[.!?]|\b(?:and|then)\b)/i)
        .map(segment => segment.trim())
        .filter(segment => segment.length > 0);

      segments.forEach(segment => {
        // Clean up the segment
        let taskDesc = cleanTaskDescription(segment);
        
        // Skip if too short or doesn't look like a task
        if (taskDesc.length < 5) return;
        
        // Skip if it's just a header or label
        if (taskDesc.toLowerCase().endsWith('tasks:')) return;

        // Remove common prefixes
        taskDesc = taskDesc
          .replace(/^(tasks?|updates?|summary|notes?):?\s*/i, '')
          .replace(/^[•\-*]\s*/, '')
          .trim();

        if (taskDesc) {
          tasks.push({
            id: Date.now().toString() + Math.random(),
            description: taskDesc,
            assignee: assignee,
            date: format(startOfDay(parseDateValue), 'yyyy-MM-dd')
          });
        }
      });

      return tasks;
    }

    console.log('Parsed tasks:', parsedTasks);

    // Only emit tasks if we found any
    if (parsedTasks.length > 0) {
      parsedTasks.forEach(task => {
        console.log('Emitting task:', task);
        socket.emit('addTask', task);
      });

      setShowParseDialog(false);
      setParseText('');
      handleDayClick(parseDateValue);
    } else {
      console.log('No valid tasks found in the text');
    }
  };

  const handleGenerateReport = () => {
    if (selectedMembers.length === 0 || !dateRange[0] || !dateRange[1]) return;

    const [startDate, endDate] = dateRange;
    const reportContent = [];
    
    // Report Header
    reportContent.push('Task Report\n');
    reportContent.push(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}\n`);
    reportContent.push(`Period: ${format(startDate, 'MMMM d, yyyy')} to ${format(endDate, 'MMMM d, yyyy')}\n\n`);

    // Individual Summaries
    let totalTasksAllMembers = 0;
    const memberTaskCounts = {};

    selectedMembers.forEach(memberName => {
      const memberTasks = tasks.filter(task => {
        const taskDate = parseISO(task.date);
        return task.assignee === memberName && 
               taskDate >= startOfDay(startDate) && 
               taskDate <= endOfDay(endDate);
      });
      
      memberTaskCounts[memberName] = memberTasks.length;
      totalTasksAllMembers += memberTasks.length;
      
      reportContent.push(`${memberName}'s Tasks:\n`);
      
      // Add personal summary
      reportContent.push('Summary:\n');
      reportContent.push(generatePersonalSummary(memberName, memberTasks));
      reportContent.push('Detailed Task List:\n');
      
      if (memberTasks.length === 0) {
        reportContent.push('No tasks completed during this period.\n');
      } else {
        // Group tasks by date
        const tasksByDate = {};
        memberTasks.forEach(task => {
          const dateKey = format(parseISO(task.date), 'MMM d, yyyy');
          if (!tasksByDate[dateKey]) {
            tasksByDate[dateKey] = [];
          }
          tasksByDate[dateKey].push(task);
        });

        // Output tasks grouped by date
        Object.entries(tasksByDate)
          .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
          .forEach(([date, dateTasks]) => {
            reportContent.push(`\n  ${date}:`);
            dateTasks.forEach(task => {
              reportContent.push(`    - ${task.description}\n`);
            });
          });
      }
      reportContent.push('\n');
    });

    // Team Summary (if multiple members selected)
    if (selectedMembers.length > 1) {
      reportContent.push('\nTeam Summary:\n');
      
      // Generate team overview
      const periodLength = Math.ceil((endOfDay(endDate) - startOfDay(startDate)) / (1000 * 60 * 60 * 24)) + 1;
      const tasksPerDay = (totalTasksAllMembers / periodLength).toFixed(1);
      
      reportContent.push(`Over this ${periodLength}-day period, the team completed ${totalTasksAllMembers} tasks `);
      reportContent.push(`(averaging ${tasksPerDay} tasks per day).\n\n`);
      
      reportContent.push('Individual Contributions:\n');
      selectedMembers.forEach(memberName => {
        const percentage = (memberTaskCounts[memberName] / totalTasksAllMembers * 100).toFixed(1);
        reportContent.push(`  - ${memberName}: ${memberTaskCounts[memberName]} tasks (${percentage}%)\n`);
      });
    }

    // Create and download the file
    const blob = new Blob([reportContent.join('')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task_report_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setShowReportDialog(false);
    setSelectedMembers([]);
    setDateRange([null, null]);
  };

  const generatePersonalSummary = (memberName, tasks) => {
    if (tasks.length === 0) {
      return `${memberName} had no recorded tasks during this period.\n`;
    }

    // Analyze tasks to identify themes and patterns
    const taskAnalysis = {
      meetings: tasks.filter(t => 
        t.description.toLowerCase().includes('meeting') || 
        t.description.toLowerCase().includes('discuss')),
      planning: tasks.filter(t => 
        t.description.toLowerCase().includes('plan') || 
        t.description.toLowerCase().includes('priorit') ||
        t.description.toLowerCase().includes('roadmap')),
      development: tasks.filter(t => 
        t.description.toLowerCase().includes('develop') || 
        t.description.toLowerCase().includes('implement') ||
        t.description.toLowerCase().includes('build')),
      review: tasks.filter(t => 
        t.description.toLowerCase().includes('review') || 
        t.description.toLowerCase().includes('feedback')),
      coordination: tasks.filter(t => 
        t.description.toLowerCase().includes('coordinat') || 
        t.description.toLowerCase().includes('facilitat') ||
        t.description.toLowerCase().includes('organiz')),
      stakeholders: tasks.filter(t => 
        t.description.toLowerCase().includes('stakeholder') || 
        t.description.toLowerCase().includes('client') ||
        t.description.toLowerCase().includes('partner')),
    };

    // Find team member mentions
    const teamMemberMentions = tasks
      .map(task => {
        const words = task.description.toLowerCase().split(/\s+/);
        return words.find(word => 
          word.length > 2 && 
          members.some(m => m.name.toLowerCase().includes(word))
        );
      })
      .filter(Boolean);

    // Generate the main focus area
    let mainFocus = Object.entries(taskAnalysis)
      .sort((a, b) => b[1].length - a[1].length)[0][0];

    // Start building the summary
    let summary = '';

    // Opening statement based on main activities
    if (taskAnalysis.coordination.length > 0 || taskAnalysis.meetings.length > 0) {
      summary += `${memberName} focused on ${
        taskAnalysis.coordination.length > taskAnalysis.meetings.length 
          ? 'high-level project coordination' 
          : 'team collaboration and alignment'
      }`;
    } else if (taskAnalysis.development.length > 0) {
      summary += `${memberName} concentrated on technical development and implementation`;
    } else if (taskAnalysis.planning.length > 0) {
      summary += `${memberName} focused on strategic planning and prioritization`;
    } else {
      summary += `${memberName} worked on various tasks`;
    }

    // Add context about key activities
    let activities = [];
    if (taskAnalysis.meetings.length > 0) {
      const meetingContext = taskAnalysis.meetings[0].description
        .replace(/^-\s*/, '')
        .toLowerCase()
        .includes('un team') 
          ? 'with the UN Team' 
          : 'with key stakeholders';
      activities.push(`organized meetings ${meetingContext}`);
    }
    if (taskAnalysis.stakeholders.length > 0) {
      activities.push('addressed stakeholder feedback');
    }
    if (taskAnalysis.development.length > 0) {
      activities.push('guided development initiatives');
    }

    if (activities.length > 0) {
      summary += `, ${activities.join(', ')}, and `;
    } else {
      summary += ' and ';
    }

    // Add specific project areas
    const projectAreas = tasks
      .map(task => {
        const description = task.description.toLowerCase();
        if (description.includes('signup')) return 'signup process';
        if (description.includes('platform')) return 'platform enhancements';
        if (description.includes('partnership')) return 'partnership initiatives';
        if (description.includes('pipeline')) return 'development pipeline';
        return null;
      })
      .filter(Boolean);

    if (projectAreas.length > 0) {
      summary += `contributed to improvements in ${projectAreas.join(', ')}. `;
    } else {
      summary += 'supported various project initiatives. ';
    }

    // Add collaboration details if any
    if (teamMemberMentions.length > 0) {
      summary += `${memberName} collaborated closely with team members`;
      if (taskAnalysis.review.length > 0) {
        summary += ', providing feedback and ensuring alignment with project goals. ';
      } else {
        summary += ' to drive project objectives forward. ';
      }
    }

    // Add impact statement
    const impactStatements = [
      'His efforts helped maintain momentum on key deliverables',
      'His contributions supported the team\'s sprint objectives',
      'His work helped drive progress on critical initiatives',
      'His involvement was key to moving project milestones forward'
    ];
    summary += impactStatements[Math.floor(Math.random() * impactStatements.length)] + '.\n';

    return summary;
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
              <Button 
                color="inherit" 
                onClick={() => {
                  setParseDateValue(new Date());
                  setShowParseDialog(true);
                }}
                sx={{ mr: 2 }}
              >
                PARSE TEXT
              </Button>
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
            maxWidth="md" 
            fullWidth
          >
            <DialogTitle>Team Members</DialogTitle>
            <DialogContent>
              <TeamMembers socket={socket} members={members} />
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

          <Dialog 
            open={showParseDialog} 
            onClose={() => setShowParseDialog(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Parse Tasks</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2, mt: 1 }}>
                <DatePicker
                  label="Select Date"
                  value={parseDateValue}
                  onChange={(newValue) => {
                    console.log('Date changed:', newValue);
                    setParseDateValue(newValue);
                  }}
                  slotProps={{
                    textField: { fullWidth: true }
                  }}
                  sx={{ mb: 2 }}
                />
              </Box>
              <TextField
                autoFocus
                multiline
                rows={10}
                label="Paste text to parse"
                fullWidth
                value={parseText}
                onChange={(e) => {
                  console.log('Text changed:', e.target.value);
                  setParseText(e.target.value);
                }}
                placeholder="Paste text with team member names and their tasks..."
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowParseDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => {
                  console.log('Parse Tasks button clicked');
                  handleParseText();
                }}
                variant="contained"
                disabled={!parseText.trim() || !parseDateValue}
                sx={{
                  backgroundColor: '#6750A4',
                  '&:hover': {
                    backgroundColor: '#4F378B'
                  }
                }}
              >
                Parse Tasks
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={showReportDialog}
            onClose={() => setShowReportDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Generate Task Report</DialogTitle>
            <DialogContent>
              <Box sx={{ 
                mt: 2, 
                mb: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                <DatePicker
                  label="Start Date"
                  value={dateRange[0]}
                  onChange={(newValue) => setDateRange([newValue, dateRange[1]])}
                  slotProps={{
                    textField: { fullWidth: true }
                  }}
                  maxDate={dateRange[1]}
                />
                <DatePicker
                  label="End Date"
                  value={dateRange[1]}
                  onChange={(newValue) => setDateRange([dateRange[0], newValue])}
                  slotProps={{
                    textField: { fullWidth: true }
                  }}
                  minDate={dateRange[0]}
                />
              </Box>
              <FormControl fullWidth>
                <InputLabel>Select Team Members</InputLabel>
                <Select
                  multiple
                  value={selectedMembers}
                  onChange={(e) => setSelectedMembers(e.target.value)}
                  renderValue={(selected) => selected.join(', ')}
                  label="Select Team Members"
                >
                  <MenuItem value="ALL" onClick={() => setSelectedMembers(members.map(m => m.name))}>
                    <Checkbox checked={selectedMembers.length === members.length} />
                    <ListItemText primary="Select All" />
                  </MenuItem>
                  <Divider />
                  {members.map((member) => (
                    <MenuItem key={member.id} value={member.name}>
                      <Checkbox checked={selectedMembers.indexOf(member.name) > -1} />
                      <ListItemText primary={member.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setShowReportDialog(false);
                setSelectedMembers([]);
                setDateRange([null, null]);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReport}
                variant="contained"
                disabled={selectedMembers.length === 0 || !dateRange[0] || !dateRange[1]}
                sx={{
                  backgroundColor: '#6750A4',
                  '&:hover': {
                    backgroundColor: '#4F378B'
                  }
                }}
              >
                Generate Report
              </Button>
            </DialogActions>
          </Dialog>

          <Footer />
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
