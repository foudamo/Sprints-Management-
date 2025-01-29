import React, { useState } from 'react';
import { Paper, Typography, Box, IconButton } from '@mui/material';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TextInput from './TextInput';

function TaskColumn({ title, tasks, onTasksUpdate }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleAddTask = (text) => {
    if (!text.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      content: text
    };
    onTasksUpdate([...tasks, newTask]);
    setIsAdding(false);
  };

  const handleEditTask = (id, newText) => {
    if (!newText.trim()) return;
    const updatedTasks = tasks.map(task =>
      task.id === id ? { ...task, content: newText } : task
    );
    onTasksUpdate(updatedTasks);
    setEditingId(null);
  };

  const handleDeleteTask = (id) => {
    const updatedTasks = tasks.filter(task => task.id !== id);
    onTasksUpdate(updatedTasks);
  };

  return (
    <Paper sx={{ width: 300, bgcolor: '#f8f9fa', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      <Droppable droppableId={title}>
        {(provided) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{ minHeight: 100 }}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    sx={{ p: 2, mb: 1, bgcolor: 'white' }}
                  >
                    {editingId === task.id ? (
                      <TextInput
                        initialValue={task.content}
                        onSubmit={(text) => handleEditTask(task.id, text)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography>{task.content}</Typography>
                        <Box>
                          <IconButton size="small" onClick={() => setEditingId(task.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteTask(task.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                  </Paper>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>

      {isAdding ? (
        <TextInput
          onSubmit={handleAddTask}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <IconButton
          onClick={() => setIsAdding(true)}
          sx={{ width: '100%', mt: 1 }}
        >
          <AddIcon />
        </IconButton>
      )}
    </Paper>
  );
}

export default TaskColumn;
