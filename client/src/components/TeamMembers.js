import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const TeamMembers = ({ socket, members: propMembers }) => {
  console.log('TeamMembers component rendering with members:', propMembers);

  const [open, setOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [memberData, setMemberData] = useState({ 
    name: '', 
    role: '',
    nicknames: ''
  });
  const [notification, setNotification] = useState({ open: false, message: '', type: 'info' });
  const [members, setMembers] = useState(propMembers || []);

  useEffect(() => {
    if (!socket) return;

    // Listen for member updates
    socket.on('member_added', (member) => {
      console.log('Member added:', member);
      setMembers(prev => [...prev, member]);
      setNotification({ open: true, message: 'Member added successfully', type: 'success' });
    });

    socket.on('member_updated', (member) => {
      console.log('Member updated:', member);
      setMembers(prev => prev.map(m => m.id === member.id ? member : m));
      setNotification({ open: true, message: 'Member updated successfully', type: 'success' });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setNotification({ open: true, message: error.message || 'An error occurred', type: 'error' });
    });

    return () => {
      socket.off('member_added');
      socket.off('member_updated');
      socket.off('error');
    };
  }, [socket]);

  // Update local members when prop changes
  useEffect(() => {
    console.log('Members prop updated:', propMembers);
    if (propMembers) {
      setMembers(propMembers);
    }
  }, [propMembers]);

  const handleOpen = (member = null) => {
    console.log('Opening dialog with member:', member);
    if (member) {
      setEditMember(member);
      setMemberData({
        name: member.name,
        role: member.role || '',
        nicknames: Array.isArray(member.nicknames) ? member.nicknames.join(', ') : ''
      });
    } else {
      setEditMember(null);
      setMemberData({ name: '', role: '', nicknames: '' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMember(null);
    setMemberData({ name: '', role: '', nicknames: '' });
  };

  const handleSave = () => {
    if (!memberData.name.trim()) {
      setNotification({ open: true, message: 'Name is required', type: 'error' });
      return;
    }

    const data = {
      name: memberData.name.trim(),
      role: memberData.role.trim() || 'Developer',
      nicknames: memberData.nicknames ? memberData.nicknames.split(',').map(n => n.trim()).filter(Boolean) : []
    };

    console.log('Saving member data:', data);

    if (editMember) {
      console.log('Updating existing member:', editMember.id);
      socket.emit('update_member', { id: editMember.id, ...data });
    } else {
      console.log('Adding new member');
      socket.emit('add_member', data);
    }

    handleClose();
  };

  const handleDelete = (memberId) => {
    if (window.confirm('Are you sure you want to delete this team member?')) {
      console.log('Deleting member:', memberId);
      socket.emit('delete_member', memberId);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  console.log('Rendering member list with:', members);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Size of Team ({members.length})</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Member
        </Button>
      </Box>

      <List>
        {members.map((member) => {
          console.log('Rendering member:', member);
          return (
            <ListItem key={member.id}>
              <ListItemText
                primary={member.name}
                secondary={
                  <>
                    {member.role}
                    {member.nicknames?.length > 0 && ` (${member.nicknames.join(', ')})`}
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" aria-label="edit" onClick={() => handleOpen(member)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(member.id)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editMember ? 'Edit Member' : 'Add Member'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            value={memberData.name}
            onChange={(e) => setMemberData({ ...memberData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Role"
            type="text"
            fullWidth
            value={memberData.role}
            onChange={(e) => setMemberData({ ...memberData, role: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Nicknames (comma-separated)"
            type="text"
            fullWidth
            value={memberData.nicknames}
            onChange={(e) => setMemberData({ ...memberData, nicknames: e.target.value })}
            helperText="Enter nicknames separated by commas"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.type}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeamMembers;
