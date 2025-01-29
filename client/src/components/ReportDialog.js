import React, { useState } from 'react';
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
  TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

const ReportDialog = ({ open, onClose, members, socket }) => {
  const [reportData, setReportData] = useState({
    startDate: null,
    endDate: null,
    teamMember: 'all'
  });

  const handleGenerate = () => {
    if (reportData.startDate && reportData.endDate) {
      socket.emit('generateReport', {
        startDate: reportData.startDate,
        endDate: reportData.endDate,
        teamMember: reportData.teamMember
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Generate Report</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
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
          renderInput={(params) => <TextField {...params} fullWidth sx={{ mt: 2 }} />}
        />

        <DatePicker
          label="End Date"
          value={reportData.endDate}
          onChange={(newValue) => setReportData({ ...reportData, endDate: newValue })}
          renderInput={(params) => <TextField {...params} fullWidth sx={{ mt: 2 }} />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          disabled={!reportData.startDate || !reportData.endDate}
        >
          Generate Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
