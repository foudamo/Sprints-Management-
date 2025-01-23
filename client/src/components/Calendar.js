import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Button,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Visibility as VisibilityIcon,
  ViewColumn as ViewColumnIcon,
  CalendarMonth as CalendarMonthIcon,
} from '@mui/icons-material';
import TextViewer from './TextViewer';
import ReportExport from './ReportExport';
import TextInput from './TextInput'; // Import TextInput component

const Calendar = ({ members, onDateSelect, selectedDate, socket, viewMode, onViewModeChange, handleParsingComplete }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [viewingDate, setViewingDate] = useState(null);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    onDateSelect(date);
  };

  const getTasksForDate = (date) => {
    if (!members) return 0;
    
    return Object.values(members).reduce((acc, member) => {
      const tasks = member.tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getFullYear() === date.getFullYear() &&
               taskDate.getMonth() === date.getMonth() &&
               taskDate.getDate() === date.getDate();
      });
      return acc + tasks.length;
    }, 0);
  };

  const handleViewText = (date, e) => {
    e.stopPropagation();
    const isoDate = date.toISOString();
    setViewingDate(isoDate);
    socket.emit('get-original-text', isoDate);
    socket.once('original-text', ({ text }) => {
      setOriginalText(text);
      setViewerOpen(true);
    });
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setOriginalText('');
    setViewingDate(null);
  };

  const renderCalendarDays = () => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();

    // Get number of days in month
    const monthLength = new Date(year, month + 1, 0).getDate();

    // Previous month's days
    const prevMonthLength = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push(
        <Grid item key={`prev-${i}`}>
          <Paper
            elevation={0}
            sx={{
              p: 1,
              bgcolor: 'background.paper',
              height: '120px',
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 0,
              boxSizing: 'border-box'
            }}
          >
            <Typography 
              variant="body2"
              sx={{ 
                color: 'text.disabled',
                fontWeight: 400
              }}
            >
              {prevMonthLength - i}
            </Typography>
          </Paper>
        </Grid>
      );
    }

    // Current month's days
    for (let day = 1; day <= monthLength; day++) {
      const date = new Date(year, month, day);
      const isSelected = selectedDate && 
        date.getFullYear() === new Date(selectedDate).getFullYear() &&
        date.getMonth() === new Date(selectedDate).getMonth() &&
        date.getDate() === new Date(selectedDate).getDate();
      
      const taskCount = getTasksForDate(date);

      days.push(
        <Grid item key={`current-${day}`}>
          <Paper
            elevation={1}
            sx={{
              p: 1,
              bgcolor: isSelected 
                ? 'primary.light' 
                : taskCount > 0 
                  ? '#f8f9ff'  
                  : '#ffffff',
              height: '120px',
              width: '100%',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: isSelected ? 'primary.light' : 'action.hover',
                boxShadow: 'none',
                transform: 'translateY(-1px)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              },
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 0,
              boxSizing: 'border-box',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: 'none'
            }}
            onClick={() => handleDateClick(date.toISOString())}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 1,
              pr: 0.5
            }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: date.getDate() === new Date().getDate() ? 600 : 400,
                  color: date.getDate() === new Date().getDate() ? 'primary.main' : 'text.primary'
                }}
              >
                {day}
              </Typography>
              {taskCount > 0 && (
                <Chip
                  size="small"
                  label={`${taskCount}`}
                  color="primary"
                  sx={{ 
                    height: '18px',
                    minWidth: '18px',
                    '& .MuiChip-label': {
                      px: 0.75,
                      fontSize: '0.7rem',
                      lineHeight: 1
                    }
                  }}
                />
              )}
            </Box>
            {taskCount > 0 && (
              <Button
                size="small"
                startIcon={<VisibilityIcon sx={{ fontSize: '0.8rem' }} />}
                onClick={(e) => handleViewText(date, e)}
                variant="text"
                sx={{ 
                  mt: 'auto',
                  py: 0.5,
                  px: 0.5,
                  fontSize: '0.75rem',
                  justifyContent: 'flex-start',
                  color: 'text.secondary',
                  minWidth: 0,
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                View Text
              </Button>
            )}
          </Paper>
        </Grid>
      );
    }

    // Next month's days
    const remainingCells = 42 - (startingDay + monthLength); // 42 is 6 rows of 7 days
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <Grid item key={`next-${i}`}>
          <Paper
            elevation={0}
            sx={{
              p: 1,
              bgcolor: 'background.paper',
              height: '120px',
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 0,
              boxSizing: 'border-box'
            }}
          >
            <Typography 
              variant="body2"
              sx={{ 
                color: 'text.disabled',
                fontWeight: 400
              }}
            >
              {i}
            </Typography>
          </Paper>
        </Grid>
      );
    }

    return days;
  };

  return (
    <Box sx={{ 
      width: '100%', 
      p: 2,
      bgcolor: '#fff',
      borderRadius: 2,
      boxShadow: 'none',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 3,
        px: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 400 }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}>
            <Button
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              onClick={() => onViewModeChange('columns')}
              sx={{
                borderRadius: 100,
                textTransform: 'none',
                px: 3,
                py: 1,
                color: 'text.secondary',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'divider'
                },
                ...(viewMode === 'columns' && {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                })
              }}
            >
              Daily Tasks
            </Button>
            <TextInput
              socket={socket}
              onParsingComplete={handleParsingComplete}
              selectedDate={selectedDate}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handlePrevMonth} size="small" sx={{ color: 'text.secondary' }}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton onClick={handleNextMonth} size="small" sx={{ color: 'text.secondary' }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <ReportExport members={members} socket={socket} />
        </Box>
      </Box>

      <Grid 
        container 
        columns={7} 
        spacing={0}
        sx={{ 
          borderLeft: '1px solid',
          borderTop: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.12)',
          borderRadius: '16px',
          width: '100%',
          overflow: 'hidden',
          '& .MuiGrid-item': {
            padding: '0 !important',
            borderRight: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.12)',
            display: 'flex',
            minHeight: 0,
            flexBasis: 'calc(100% / 7)',
            maxWidth: 'calc(100% / 7)',
            bgcolor: 'background.paper'
          }
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Grid item key={day}>
            <Box sx={{ 
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 1.5,
              px: 1
            }}>
              <Typography 
                variant="caption"
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  textAlign: 'center'
                }}
              >
                {day}
              </Typography>
            </Box>
          </Grid>
        ))}
        {renderCalendarDays()}
      </Grid>

      <TextViewer
        open={viewerOpen}
        onClose={handleCloseViewer}
        text={originalText}
        date={viewingDate}
      />
    </Box>
  );
};

export default Calendar;
