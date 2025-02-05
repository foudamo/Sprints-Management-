import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

const ReportDialog = ({ open, onClose, members, socket }) => {
  const [reportData, setReportData] = useState({
    startDate: null,
    endDate: null,
    teamMember: 'all'
  });
  const [reportContent, setReportContent] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) {
      console.error('Socket is not initialized');
      setError('Connection to server not established');
      return;
    }

    // Clear the connection error if socket exists
    setError(null);

    console.log('ReportDialog mounted, socket:', socket?.connected);

    // Listen for the report generated event
    const handleReportGenerated = (data) => {
      console.log('Received report:', data);
      setReportContent(data.content);
      setDownloadFilename(data.downloadFilename);
      setError(null);
    };

    // Listen for errors
    const handleError = (error) => {
      console.error('Received error from server:', error);
      setError(error.message || 'An error occurred while generating the report');
    };

    // Listen for socket connection events
    const handleConnect = () => {
      console.log('Socket connected');
      setError(null);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setError('Connection to server lost. Please try again.');
    };

    socket.on('reportGenerated', handleReportGenerated);
    socket.on('error', handleError);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      console.log('ReportDialog unmounting, cleaning up socket listeners');
      if (socket) {
        socket.off('reportGenerated', handleReportGenerated);
        socket.off('error', handleError);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
    };
  }, [socket]);

  const handleGenerate = () => {
    console.log('Generate button clicked');
    console.log('Current report data:', reportData);
    
    if (!socket?.connected) {
      console.error('Socket is not connected!');
      setError('Not connected to server. Please try again.');
      return;
    }

    if (reportData.startDate && reportData.endDate) {
      setError(null);
      setReportContent(null);

      // Format dates to ISO string and set time to start/end of day
      const startDate = new Date(reportData.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(reportData.endDate);
      endDate.setHours(23, 59, 59, 999);

      const requestData = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        teamMember: reportData.teamMember === 'all' ? null : reportData.teamMember
      };

      console.log('Sending generateReport request:', requestData);
      console.log('Socket status:', {
        connected: socket.connected,
        id: socket.id
      });

      socket.emit('generateReport', requestData, (response) => {
        console.log('Received acknowledgment:', response);
        if (!response?.success) {
          setError(response?.error || 'Failed to generate report');
        }
      });
    } else {
      setError('Please select both start and end dates');
    }
  };

  const handleDownload = () => {
    if (!reportContent) {
      setError('No report content available to download');
      return;
    }

    try {
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename || 'task_report.txt';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report: ' + err.message);
    }
  };

  const handleClose = () => {
    setError(null);
    setReportContent(null);
    setReportData({
      startDate: null,
      endDate: null,
      teamMember: 'all'
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Report</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!reportContent ? (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Team Member</InputLabel>
              <Select
                value={reportData.teamMember}
                label="Team Member"
                onChange={(e) => setReportData({ ...reportData, teamMember: e.target.value })}
              >
                <MenuItem value="all">All Team Members</MenuItem>
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <DatePicker
              label="Start Date"
              value={reportData.startDate}
              onChange={(newValue) => setReportData({ ...reportData, startDate: newValue })}
              slotProps={{
                textField: { fullWidth: true }
              }}
            />

            <DatePicker
              label="End Date"
              value={reportData.endDate}
              onChange={(newValue) => setReportData({ ...reportData, endDate: newValue })}
              slotProps={{
                textField: { fullWidth: true }
              }}
            />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {reportContent}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {!reportContent ? (
          <Button 
            onClick={handleGenerate} 
            color="primary"
            variant="contained"
            disabled={!reportData.startDate || !reportData.endDate || !socket?.connected}
          >
            Generate Report
          </Button>
        ) : (
          <Button onClick={handleDownload} color="primary" variant="contained">
            Download Report
          </Button>
        )}
        <Button onClick={handleClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
