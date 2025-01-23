import React, { useState } from 'react';
import { Paper, Typography, Box, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
        <Typography 
          variant="body1" 
          color={member.tasks.length === 0 ? 'text.secondary' : 'primary'}
          sx={{ 
            textAlign: 'center',
            py: 2
          }}
        >
          {member.tasks.length} tasks
        </Typography>
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
        <Box>
          {member.tasks.map((task, index) => (
            <Box
              key={index}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1,
                mb: 1,
                border: '1px solid',
                borderColor: 'divider',
                p: 2
              }}
            >
              {editingTask === task ? (
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">{task.text}</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">{task.text}</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">{task.text}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
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
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default TaskColumn;
