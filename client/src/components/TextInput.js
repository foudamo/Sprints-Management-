import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  LinearProgress,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const TextInput = ({ socket, onParsingComplete, selectedDate }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', progress: 0 });

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    if (!parsing) {
      setOpen(false);
      setText('');
      setProgress({ stage: '', progress: 0 });
    }
  };

  const formatDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const handleParse = () => {
    if (!text.trim()) return;
    
    setParsing(true);
    setProgress({ stage: 'Starting parsing...', progress: 0 });
    
    // Clean up any existing listeners first
    socket.off('parsing-progress');
    socket.off('parsing-complete');
    socket.off('parsing-error');
    
    // Listen for parsing progress
    socket.on('parsing-progress', (data) => {
      setProgress(data);
    });

    // Listen for parsing completion
    socket.on('parsing-complete', (data) => {
      setParsing(false);
      onParsingComplete(data);
      handleClose();
      
      // Clean up listeners
      socket.off('parsing-progress');
      socket.off('parsing-complete');
      socket.off('parsing-error');
    });

    // Listen for parsing errors
    socket.on('parsing-error', (error) => {
      setParsing(false);
      setProgress({ stage: `Error: ${error.message}`, progress: 0 });
      
      // Clean up listeners
      socket.off('parsing-progress');
      socket.off('parsing-complete');
      socket.off('parsing-error');
    });

    // Send text to server for parsing with selected date
    socket.emit('parse-text', { 
      text, 
      selectedDate: selectedDate ? new Date(selectedDate).toISOString() : new Date().toISOString()
    });
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<EditNoteIcon />}
        onClick={handleOpen}
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
          }
        }}
      >
        Parse Text
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Parse Meeting Notes
            <Chip
              icon={<CalendarTodayIcon />}
              label={formatDate(selectedDate)}
              color="primary"
              size="small"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Paste your meeting notes here. Tasks will be created for {formatDate(selectedDate)}.
            </Typography>

            <TextField
              multiline
              rows={8}
              fullWidth
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your meeting notes here..."
              disabled={parsing}
              sx={{ mt: 2 }}
            />

            {parsing && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress variant="determinate" value={progress.progress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {progress.stage}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={parsing}>
            Cancel
          </Button>
          <Button 
            onClick={handleParse}
            variant="contained"
            disabled={!text.trim() || parsing}
          >
            Parse Tasks
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TextInput;
