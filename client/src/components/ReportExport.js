import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { DownloadOutlined } from '@mui/icons-material';

const ReportExport = ({ members, socket }) => {
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState('all');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [error, setError] = useState(null);
  const [exportAll, setExportAll] = useState(true);

  const handleOpen = () => {
    setOpen(true);
    setError(null);
    
    // Set default date range to last 4 weeks
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 28); // 4 weeks ago
    
    setStartDate(start);
    setEndDate(end);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedMember('all');
    setError(null);
  };

  const handleExport = () => {
    if (!exportAll && !selectedMember) {
      setError('Please select a team member');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      setError('Start date must be before end date');
      return;
    }

    console.log('Exporting report for:', {
      member: exportAll ? 'all' : selectedMember,
      startDate,
      endDate
    });

    socket.emit('export-report', {
      memberId: exportAll ? 'all' : selectedMember,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    socket.once('report-generated', (response) => {
      if (response.error) {
        setError(response.error);
        return;
      }

      // Create and download the report
      const element = document.createElement('a');
      const file = new Blob([response.content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      
      const fileName = exportAll 
        ? `team_report_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.txt`
        : `${members[selectedMember]?.name}_report_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.txt`;
      
      element.download = fileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      handleClose();
    });
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<DownloadOutlined />}
        onClick={handleOpen}
        sx={{ ml: 2 }}
      >
        Export Report
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Export Task Report</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportAll}
                  onChange={(e) => setExportAll(e.target.checked)}
                />
              }
              label="Export all team members"
              sx={{ mb: 2 }}
            />

            {!exportAll && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Team Member</InputLabel>
                <Select
                  value={selectedMember}
                  onChange={(e) => {
                    setSelectedMember(e.target.value);
                    setError(null);
                  }}
                  label="Team Member"
                >
                  {Object.entries(members).map(([id, member]) => (
                    <MenuItem key={id} value={id}>
                      {member.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  setStartDate(new Date(e.target.value));
                  setError(null);
                }}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  setEndDate(new Date(e.target.value));
                  setError(null);
                }}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleExport} variant="contained" color="primary">
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReportExport;
