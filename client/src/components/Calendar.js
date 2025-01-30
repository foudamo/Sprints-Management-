import React, { useState } from 'react';
import { Box, Typography, IconButton, Button, Tooltip } from '@mui/material';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  startOfWeek, 
  endOfWeek,
  parseISO,
  startOfDay
} from 'date-fns';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const Calendar = ({ tasks, socket, onDayClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDayTasks = (date) => {
    return tasks.filter(task => {
      if (!task.date) return false;
      const taskDate = startOfDay(parseISO(task.date));
      return format(taskDate, 'yyyy-MM-dd') === format(startOfDay(date), 'yyyy-MM-dd');
    });
  };

  // Group tasks by assignee for a more organized display
  const groupTasksByAssignee = (tasks) => {
    const grouped = {};
    tasks.forEach(task => {
      if (!grouped[task.assignee]) {
        grouped[task.assignee] = [];
      }
      grouped[task.assignee].push(task);
    });
    return grouped;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2,
        gap: 1
      }}>
        <Button 
          variant="outlined"
          size="small"
          onClick={handleToday}
          sx={{
            textTransform: 'none',
            borderColor: 'rgba(0, 0, 0, 0.12)',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'rgba(0, 0, 0, 0.24)',
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          TODAY
        </Button>
        <IconButton size="small" onClick={handlePrevMonth}>
          <ChevronLeftIcon />
        </IconButton>
        <IconButton size="small" onClick={handleNextMonth}>
          <ChevronRightIcon />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }}>
          {format(currentDate, 'MMMM yyyy')}
        </Typography>
      </Box>

      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
        backgroundColor: '#fff',
      }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Box 
            key={day}
            sx={{ 
              p: 1,
              textAlign: 'center',
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
              backgroundColor: '#f5f5f5',
              color: 'text.secondary',
              fontSize: '0.875rem'
            }}
          >
            {day}
          </Box>
        ))}

        {getDaysInMonth().map((day, index) => {
          const dayTasks = getDayTasks(day);
          const groupedTasks = groupTasksByAssignee(dayTasks);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodays = isToday(day);
          const totalTasks = dayTasks.length;
          
          return (
            <Box
              key={day.toString()}
              onClick={() => onDayClick(startOfDay(day))}
              sx={{
                position: 'relative',
                height: '120px', // Fixed height
                p: 1,
                borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                backgroundColor: isTodays ? '#e8f5e9' : 'white',
                opacity: isCurrentMonth ? 1 : 0.5,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: isTodays ? '#c8e6c9' : '#f5f5f5',
                },
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden' // Hide overflow
              }}
            >
              <Typography 
                variant="body2"
                sx={{
                  fontWeight: isTodays ? 'bold' : 'normal',
                  color: !isCurrentMonth ? 'text.disabled' : 'text.primary',
                  mb: 0.5
                }}
              >
                {format(day, 'd')}
                {totalTasks > 0 && (
                  <Typography
                    component="span"
                    sx={{
                      ml: 1,
                      fontSize: '0.75rem',
                      color: '#6750A4',
                      backgroundColor: '#f3e8fd',
                      px: 0.5,
                      py: 0.25,
                      borderRadius: '10px',
                    }}
                  >
                    {totalTasks}
                  </Typography>
                )}
              </Typography>
              
              <Box 
                sx={{ 
                  flex: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5
                }}
              >
                {Object.entries(groupedTasks).slice(0, 2).map(([assignee, tasks]) => {
                  const displayTasks = tasks.slice(0, 2);
                  const remainingTasks = tasks.length - 2;
                  
                  return (
                    <Box key={assignee}>
                      {displayTasks.map((task, index) => (
                        <Tooltip 
                          key={task.id} 
                          title={`${task.assignee}: ${task.description}`}
                          arrow
                        >
                          <Box
                            sx={{
                              backgroundColor: '#6750A4',
                              color: 'white',
                              p: 0.5,
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              mb: 0.5
                            }}
                          >
                            {task.description}
                          </Box>
                        </Tooltip>
                      ))}
                      {remainingTasks > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#6750A4',
                            fontSize: '0.75rem'
                          }}
                        >
                          +{remainingTasks} more from {assignee}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
                
                {Object.keys(groupedTasks).length > 2 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#6750A4',
                      fontSize: '0.75rem',
                      mt: 'auto'
                    }}
                  >
                    +{Object.keys(groupedTasks).length - 2} more assignees
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default Calendar;
