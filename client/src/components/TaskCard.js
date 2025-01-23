import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Chip,
} from '@mui/material';
import { Draggable } from 'react-beautiful-dnd';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';

function TaskCard({ task, index }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{ 
            mb: 2,
            backgroundColor: snapshot.isDragging ? '#e3f2fd' : 'white',
            '&:hover': {
              boxShadow: 3,
            },
          }}
        >
          <CardContent>
            <Typography variant="body1" gutterBottom>
              {task.text}
            </Typography>
            
            <Typography variant="caption" color="textSecondary" gutterBottom>
              From: {task.transcriptTitle}
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {task.dueDate && (
                <Chip
                  icon={<AccessTimeIcon />}
                  label={new Date(task.dueDate).toLocaleDateString()}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              
              {task.assignee && (
                <Chip
                  icon={<PersonIcon />}
                  label={task.assignee}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

export default TaskCard;
