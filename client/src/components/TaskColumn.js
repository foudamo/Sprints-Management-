import React, { useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Event as EventIcon
} from '@mui/icons-material';

const TaskColumn = ({ member, onUpdate }) => {
  const [editingTask, setEditingTask] = useState(null);
  const [editText, setEditText] = useState('');

  if (!member?.tasks) {
    return null;
  }

  const handleEditStart = (task) => {
    setEditingTask(task);
    setEditText(task.text);
  };

  const handleEditCancel = () => {
    setEditingTask(null);
    setEditText('');
  };

  const handleEditSave = () => {
    if (!editText.trim()) return;

    const updatedTasks = member.tasks.map(task => 
      task === editingTask ? { ...task, text: editText.trim() } : task
    );

    onUpdate(updatedTasks);
    setEditingTask(null);
    setEditText('');
  };

  const handleDelete = (taskToDelete) => {
    const updatedTasks = member.tasks.filter(task => task !== taskToDelete);
    onUpdate(updatedTasks);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <Paper 
      elevation={2}
      sx={{
        p: 2,
        minWidth: '300px',
        maxWidth: '400px',
        height: 'fit-content',
        backgroundColor: member.tasks.length === 0 ? 'transparent' : 'background.paper',
        boxShadow: member.tasks.length === 0 ? 'none' : '0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        borderRadius: '16px',
        border: member.tasks.length === 0 ? '1px dashed rgba(0, 0, 0, 0.12)' : 'none'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color={member.tasks.length === 0 ? 'text.secondary' : 'primary'}>
          {member.name}
        </Typography>
        <Chip 
          label={`${member.tasks.length} tasks`}
          color={member.tasks.length === 0 ? 'default' : 'primary'}
          size="small"
        />
      </Box>

      {member.tasks.length === 0 ? (
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ 
            textAlign: 'center',
            py: 2
          }}
        >
          No tasks have been added yet
        </Typography>
      ) : (
        <List>
          {member.tasks.map((task, index) => (
            <ListItem
              key={index}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1,
                mb: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ width: '100%', pr: 7 }}>
                {editingTask === task ? (
                  <TextField
                    fullWidth
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEditSave();
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <ListItemText 
                      primary={task.text}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <EventIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            {formatDate(task.dueDate)}
                            {task.timestamp && ` (${task.timestamp})`}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction sx={{ right: 8 }}>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleEditStart(task)}
                        size="small"
                        sx={{ mr: 0.5 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDelete(task)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </>
                )}
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default TaskColumn;
