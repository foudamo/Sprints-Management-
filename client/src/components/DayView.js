import React, { useState } from 'react';
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
  Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { format, parseISO, startOfDay } from 'date-fns';

const DayView = ({ date, tasks, members, socket, onClose }) => {
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskData, setTaskData] = useState({
    description: '',
    assignee: '',
    date: date ? format(startOfDay(date), 'yyyy-MM-dd') : ''
  });

  const handleOpen = (task = null) => {
    if (task) {
      setEditTask(task);
      setTaskData({
        description: task.description,
        assignee: task.assignee,
        date: format(startOfDay(parseISO(task.date)), 'yyyy-MM-dd')
      });
    } else {
      setEditTask(null);
      setTaskData({
        description: '',
        assignee: '',
        date: date ? format(startOfDay(date), 'yyyy-MM-dd') : ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditTask(null);
    setTaskData({
      description: '',
      assignee: '',
      date: date ? format(startOfDay(date), 'yyyy-MM-dd') : ''
    });
  };

  const handleSave = () => {
    if (!taskData.description || !taskData.assignee) {
      return;
    }

    const taskToSave = {
      ...taskData,
      date: format(startOfDay(date), 'yyyy-MM-dd')
    };

    if (editTask) {
      socket.emit('updateTask', { ...taskToSave, id: editTask.id });
    } else {
      socket.emit('addTask', {
        ...taskToSave,
        id: Date.now().toString()
      });
    }
    handleClose();
  };

  const handleDelete = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      socket.emit('deleteTask', { id: taskId });
    }
  };

  // Filter tasks for the selected date
  const dayTasks = tasks.filter(task => {
    if (!date || !task.date) return false;
    const taskDate = startOfDay(parseISO(task.date));
    return format(taskDate, 'yyyy-MM-dd') === format(startOfDay(date), 'yyyy-MM-dd');
  });

  // Group tasks by team member
  const groupedTasks = {};
  members.forEach(member => {
    groupedTasks[member.name] = dayTasks.filter(task => task.assignee === member.name);
  });

  if (!date) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Tasks for {format(date, 'MMMM d, yyyy')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            backgroundColor: '#6750A4',
            '&:hover': {
              backgroundColor: '#4F378B'
            }
          }}
        >
          ADD TASK
        </Button>
      </Box>

      <Grid container spacing={2}>
        {members.map((member) => (
          <Grid item xs={12} sm={6} md={4} key={member.id}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f5f5f5'
              }}
            >
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2,
                  pb: 1,
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <Typography variant="h6" component="div">
                    {member.name}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      backgroundColor: '#e0e0e0',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1
                    }}
                  >
                    {(groupedTasks[member.name] || []).length} tasks
                  </Typography>
                </Box>

                {(!groupedTasks[member.name] || groupedTasks[member.name].length === 0) ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No tasks have been added yet
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {groupedTasks[member.name].map((task) => (
                      <Card 
                        key={task.id} 
                        sx={{ 
                          backgroundColor: 'white',
                          '&:hover': {
                            '& .task-actions': {
                              opacity: 1
                            }
                          }
                        }}
                      >
                        <CardContent sx={{ 
                          py: 1, 
                          px: 2, 
                          '&:last-child': { pb: 1 },
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Typography variant="body2">
                            {task.description}
                          </Typography>
                          <Box 
                            className="task-actions" 
                            sx={{ 
                              opacity: 0, 
                              transition: 'opacity 0.2s',
                              display: 'flex',
                              gap: 0.5
                            }}
                          >
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpen(task);
                              }}
                              sx={{ padding: 0.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task.id);
                              }}
                              sx={{ padding: 0.5 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
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
            label="Description"
            fullWidth
            value={taskData.description}
            onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Assignee</InputLabel>
            <Select
              value={taskData.assignee}
              onChange={(e) => setTaskData({ ...taskData, assignee: e.target.value })}
              label="Assignee"
            >
              {members.map((member) => (
                <MenuItem key={member.id} value={member.name}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!taskData.description || !taskData.assignee}
            sx={{
              backgroundColor: '#6750A4',
              '&:hover': {
                backgroundColor: '#4F378B'
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DayView;
