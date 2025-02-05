import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { format, parseISO, startOfDay } from 'date-fns';

const DayView = ({ date, tasks, members, socket, onClose }) => {
  // Ensure date is valid
  const validDate = date instanceof Date && !isNaN(date) ? date : new Date();

  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'info' });
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    status: 'todo',
    priority: 'medium',
    dueDate: format(startOfDay(validDate), 'yyyy-MM-dd')
  });

  const [parseDialogOpen, setParseDialogOpen] = useState(false);
  const [textToParse, setTextToParse] = useState('');

  // Add socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on('tasks_updated', (updatedTasks) => {
        console.log('Received updated tasks:', updatedTasks);
        setLoading(false);
        setNotification({ 
          open: true, 
          message: 'Tasks updated successfully', 
          type: 'success' 
        });
      });

      socket.on('error', (error) => {
        console.error('Received error:', error);
        setLoading(false);
        setNotification({ 
          open: true, 
          message: error.message || 'An error occurred', 
          type: 'error' 
        });
      });

      socket.on('task-saved', () => {
        console.log('Task saved successfully');
        setLoading(false);
        setNotification({ 
          open: true, 
          message: 'Task saved successfully', 
          type: 'success' 
        });
        handleClose();
      });

      socket.on('parsing_status', (status) => {
        console.log('Parsing status:', status);
        setLoading(status.status !== 'completed' && status.status !== 'error');
        
        if (status.status === 'completed') {
          setNotification({
            open: true,
            message: 'Text parsed successfully',
            type: 'success'
          });
        } else if (status.status === 'error') {
          setNotification({
            open: true,
            message: status.message || 'Error parsing text',
            type: 'error'
          });
        } else {
          setNotification({
            open: true,
            message: status.message,
            type: 'info'
          });
        }
      });
    }
    return () => {
      if (socket) {
        socket.off('tasks_updated');
        socket.off('error');
        socket.off('task-saved');
        socket.off('parsing_status');
      }
    };
  }, [socket]);

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleOpen = (task = null) => {
    if (task) {
      setEditTask(task);
      setTaskData({
        title: task.title,
        description: task.description || '',
        assignedTo: task.assignedTo,
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? format(startOfDay(parseISO(task.dueDate)), 'yyyy-MM-dd') : format(startOfDay(validDate), 'yyyy-MM-dd')
      });
    } else {
      setEditTask(null);
      setTaskData({
        title: '',
        description: '',
        assignedTo: '',
        status: 'todo',
        priority: 'medium',
        dueDate: format(startOfDay(validDate), 'yyyy-MM-dd')
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditTask(null);
    setTaskData({
      title: '',
      description: '',
      assignedTo: '',
      status: 'todo',
      priority: 'medium',
      dueDate: format(startOfDay(validDate), 'yyyy-MM-dd')
    });
    setNotification({ ...notification, open: false });
  };

  const handleSave = async () => {
    if (!taskData.title || !taskData.assignedTo) {
      setNotification({ 
        open: true, 
        message: 'Please fill in both title and assignee', 
        type: 'error' 
      });
      return;
    }

    try {
      setLoading(true);
      setNotification({ 
        open: true, 
        message: 'Saving task...', 
        type: 'info' 
      });
      
      const dueDate = parseISO(taskData.dueDate);
      
      if (!(dueDate instanceof Date) || isNaN(dueDate)) {
        setNotification({ 
          open: true, 
          message: 'Invalid due date', 
          type: 'error' 
        });
        setLoading(false);
        return;
      }

      const taskToSave = {
        ...taskData,
        dueDate: dueDate.toISOString()
      };

      console.log('Saving task:', taskToSave);

      // Create a promise that resolves when we get a response
      const savePromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Save operation timed out'));
        }, 30000); // Increased timeout to 30 seconds

        const handleSuccess = (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        };

        const handleError = (error) => {
          clearTimeout(timeoutId);
          reject(error);
        };

        // Listen for both possible success events
        socket.once('task_added', handleSuccess);
        socket.once('task_save_success', handleSuccess);
        socket.once('error', handleError);

        // Emit the appropriate event
        if (editTask) {
          socket.emit('update_task', { ...taskToSave, id: editTask.id });
        } else {
          socket.emit('add_task', taskToSave);
        }

        // Cleanup listeners if component unmounts
        return () => {
          clearTimeout(timeoutId);
          socket.off('task_added', handleSuccess);
          socket.off('task_save_success', handleSuccess);
          socket.off('error', handleError);
        };
      });

      await savePromise;
      setLoading(false);
      setNotification({ 
        open: true, 
        message: 'Task saved successfully', 
        type: 'success' 
      });
      handleClose();
    } catch (error) {
      console.error('Error saving task:', error);
      setNotification({ 
        open: true, 
        message: error.message || 'Failed to save task', 
        type: 'error' 
      });
      setLoading(false);
    }
  };

  const handleDelete = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setLoading(true);
      setNotification({ 
        open: true, 
        message: 'Deleting task...', 
        type: 'info' 
      });
      socket.emit('delete_task', taskId);
    }
  };

  const handleParseText = () => {
    if (textToParse.trim()) {
      setLoading(true);
      setNotification({ 
        open: true, 
        message: 'Parsing text...', 
        type: 'info' 
      });
      socket.emit('parse_text', { text: textToParse, taskDate: validDate });
      setParseDialogOpen(false);
      setTextToParse('');
    }
  };

  // Filter tasks for the selected day
  const dayTasks = tasks.filter(task => {
    if (!task || !task.dueDate) {
      console.debug('Skipping task without dueDate:', task);
      return false;
    }

    try {
      // Parse the task date and convert it to the local timezone
      const taskDate = parseISO(task.dueDate);
      
      if (!(taskDate instanceof Date) || isNaN(taskDate)) {
        console.warn('Invalid task date:', task.dueDate, task);
        return false;
      }

      // Compare dates ignoring time
      const taskDay = format(startOfDay(taskDate), 'yyyy-MM-dd');
      const selectedDay = format(startOfDay(validDate), 'yyyy-MM-dd');
      
      const matches = taskDay === selectedDay;
      console.debug('Comparing dates:', {
        taskDay,
        selectedDay,
        matches,
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.dueDate
      });
      return matches;
    } catch (error) {
      console.warn('Error processing task date:', error, task);
      return false;
    }
  });

  // Add debug logging
  console.log('Date filtering:', {
    selectedDate: format(validDate, 'yyyy-MM-dd'),
    totalTasks: tasks.length,
    filteredTasks: dayTasks.length,
    sampleTask: dayTasks[0] ? {
      id: dayTasks[0].id,
      title: dayTasks[0].title,
      dueDate: dayTasks[0].dueDate,
      assignedTo: dayTasks[0].assignedTo,
      assignedMember: dayTasks[0].assignedMember
    } : null
  });

  // Group tasks by assignee with error handling
  const tasksByAssignee = dayTasks.reduce((acc, task) => {
    if (!task || !task.assignedTo) {
      console.debug('Skipping task without assignedTo:', task);
      return acc;
    }

    try {
      const assigneeId = task.assignedTo;
      const memberMatch = members.find(m => m.id === assigneeId);
      
      if (!memberMatch) {
        console.warn('Task assigned to unknown member:', { task, assigneeId });
        return acc;
      }

      if (!acc[assigneeId]) {
        acc[assigneeId] = [];
      }
      acc[assigneeId].push({
        ...task,
        assignedMember: memberMatch
      });
      console.debug('Grouped task:', { 
        assigneeId, 
        memberName: memberMatch.name, 
        taskTitle: task.title 
      });
    } catch (error) {
      console.warn('Error grouping task:', error, task);
    }
    return acc;
  }, {});

  // Add debug logging for task grouping
  console.log('Task grouping:', Object.entries(tasksByAssignee).map(([id, tasks]) => ({
    assigneeId: id,
    assigneeName: members.find(m => m.id === id)?.name,
    taskCount: tasks.length
  })));

  // Add debug logging for member mapping
  console.log('Member mapping:', members.map(member => ({
    memberId: member.id,
    memberName: member.name,
    taskCount: tasksByAssignee[member.id]?.length || 0
  })));

  if (!validDate) {
    return null;
  }

  return (
    <Box sx={{ p: 2, maxWidth: '100%', margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Tasks for {validDate ? format(validDate, 'MMMM d, yyyy') : 'Loading...'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            disabled={loading}
          >
            Add Task
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setParseDialogOpen(true)}
            disabled={loading}
          >
            Parse Text
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseNotification}
          severity={notification.type}
          variant="filled"
          sx={{ 
            width: '100%',
            backgroundColor: notification.type === 'success' ? '#4caf50' : undefined
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <Grid container spacing={2}>
        {members.map(member => {
          const memberTasks = tasksByAssignee[member.id] || [];
          const hasNoTasks = memberTasks.length === 0;
          
          return (
            <Grid item xs={12} md={6} lg={4} key={member.id}>
              <Card 
                sx={{ 
                  mb: 2,
                  height: '100%',
                  backgroundColor: hasNoTasks ? '#f5f5f5' : '#fff',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: hasNoTasks ? 'none' : 'translateY(-2px)',
                    boxShadow: hasNoTasks ? 1 : 3
                  }
                }}
              >
                <CardContent>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      color: hasNoTasks ? 'text.secondary' : 'text.primary',
                      borderBottom: hasNoTasks ? 'none' : '2px solid #6750A4',
                      pb: 1,
                      mb: 2
                    }}
                  >
                    {member.name}
                  </Typography>
                  {memberTasks.map(task => (
                    <Box
                      key={task.id}
                      sx={{
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        backgroundColor: '#f8f4ff',
                        border: '1px solid #e0d4ff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1">
                          {task.title}
                        </Typography>
                        {task.description && (
                          <Typography variant="body2" color="textSecondary">
                            {task.description}
                          </Typography>
                        )}
                        <Typography variant="caption" color="textSecondary">
                          Status: {task.status}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleOpen(task)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(task.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                  {hasNoTasks && (
                    <Box 
                      sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 3,
                        opacity: 0.7
                      }}
                    >
                      <Typography 
                        variant="body1" 
                        color="text.secondary"
                        sx={{ 
                          fontStyle: 'italic',
                          textAlign: 'center'
                        }}
                      >
                        No tasks assigned
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog 
        open={open} 
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '500px'
          }
        }}
      >
        <DialogTitle>{editTask ? 'Edit Task' : 'New Task'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            type="text"
            fullWidth
            value={taskData.title}
            onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
            required
            error={!taskData.title}
            helperText={!taskData.title ? 'Title is required' : ''}
          />
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={taskData.description}
            onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
          />
          <FormControl fullWidth margin="dense" error={!taskData.assignedTo}>
            <InputLabel>Assigned To</InputLabel>
            <Select
              value={taskData.assignedTo}
              onChange={(e) => setTaskData({ ...taskData, assignedTo: e.target.value })}
              required
            >
              {members.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
            {!taskData.assignedTo && (
              <Typography variant="caption" color="error">
                Please select a team member
              </Typography>
            )}
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select
              value={taskData.status}
              onChange={(e) => setTaskData({ ...taskData, status: e.target.value })}
            >
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="done">Done</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select
              value={taskData.priority}
              onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Due Date"
            type="date"
            fullWidth
            value={taskData.dueDate}
            onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            color="primary"
            disabled={loading || !taskData.title || !taskData.assignedTo}
          >
            {loading ? 'Saving...' : (editTask ? 'Save' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Parse Text Dialog */}
      <Dialog 
        open={parseDialogOpen} 
        onClose={() => setParseDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Parse Text</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={8}
            value={textToParse}
            onChange={(e) => setTextToParse(e.target.value)}
            margin="dense"
            label="Enter text to parse"
            fullWidth
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParseDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleParseText}
            variant="contained"
            disabled={!textToParse.trim()}
          >
            Parse
          </Button>
        </DialogActions>
      </Dialog>

      <Button variant="outlined" onClick={onClose}>
        Close
      </Button>
    </Box>
  );
};

export default DayView;
