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
    if (!Array.isArray(tasks)) return [];
    
    return tasks.filter(task => {
      try {
        if (!task || !task.dueDate) return false;
        const taskDate = startOfDay(parseISO(task.dueDate));
        const compareDate = startOfDay(date);
        return taskDate.getTime() === compareDate.getTime();
      } catch (error) {
        console.warn('Error processing task date:', error, task);
        return false;
      }
    });
  };

  // Group tasks by assignee for a more organized display
  const groupTasksByAssignee = (tasks) => {
    const grouped = {};
    tasks.forEach(task => {
      if (!task || !task.assignee) return;
      
      // Get assignee name from either the assignee object or direct property
      const assigneeName = task.assignee?.name || 
                          task.assignee?.fullName || 
                          (typeof task.assignee === 'string' ? task.assignee : null);
      
      if (!assigneeName) return;
      
      if (!grouped[assigneeName]) {
        grouped[assigneeName] = [];
      }
      grouped[assigneeName].push(task);
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
          variant="contained"
          size="small"
          onClick={handleToday}
          sx={{
            textTransform: 'none',
            backgroundColor: '#e8f5e9',
            color: '#1b5e20',
            border: '1px solid #c8e6c9',
            '&:hover': {
              backgroundColor: '#c8e6c9',
            },
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 'auto',
            px: 1.5,
            py: 0.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography 
              variant="body2" 
              component="span"
              sx={{ 
                fontWeight: 'bold',
                fontSize: '0.875rem'
              }}
            >
              TODAY
            </Typography>
            <Typography 
              variant="body2" 
              component="span"
              sx={{ 
                fontSize: '0.75rem',
                opacity: 0.8,
                borderLeft: '1px solid #a5d6a7',
                pl: 1
              }}
            >
              {format(new Date(), 'EEE, MMM d')}
            </Typography>
          </Box>
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
                height: '120px',
                p: 1,
                borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                backgroundColor: isTodays 
                  ? '#e8f5e9' 
                  : totalTasks > 0 
                    ? '#f8f4ff'  
                    : 'white',
                opacity: isCurrentMonth ? 1 : 0.5,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isTodays 
                    ? '#c8e6c9' 
                    : totalTasks > 0 
                      ? '#f0e6ff'  
                      : '#f5f5f5',
                  transform: totalTasks > 0 ? 'scale(1.02)' : 'none',
                },
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: totalTasks > 0 ? '0 1px 3px rgba(103, 80, 164, 0.1)' : 'none',
                borderLeft: totalTasks > 0 ? '3px solid #6750A4' : 'none',
              }}
            >
              <Typography 
                variant="body2"
                sx={{
                  fontWeight: isTodays || totalTasks > 0 ? 'bold' : 'normal',
                  color: !isCurrentMonth 
                    ? 'text.disabled' 
                    : totalTasks > 0 
                      ? '#6750A4'  
                      : 'text.primary',
                  mb: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>{format(day, 'd')}</span>
                {totalTasks > 0 && (
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.75rem',
                      color: '#fff',
                      backgroundColor: '#6750A4',
                      px: 0.8,
                      py: 0.25,
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      minWidth: '20px',
                      textAlign: 'center'
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
                          title={`${assignee}: ${task.title || task.description}`}
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
                              cursor: 'pointer'
                            }}
                          >
                            {task.title || task.description}
                          </Box>
                        </Tooltip>
                      ))}
                      {remainingTasks > 0 && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            display: 'block',
                            pl: 0.5 
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
                      color: 'text.secondary',
                      display: 'block',
                      pl: 0.5 
                    }}
                  >
                    +{Object.keys(groupedTasks).length - 2} more members
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
