import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const TeamMembers = ({ socket }) => {
  const [open, setOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [memberData, setMemberData] = useState({ name: '', nicknames: '' });
  const [members, setMembers] = useState([]);

  React.useEffect(() => {
    if (socket) {
      socket.emit('getTeamMembers');
      socket.on('teamMembersUpdated', (updatedMembers) => {
        setMembers(updatedMembers);
      });
    }
  }, [socket]);

  const handleOpen = (member = null) => {
    if (member) {
      setEditMember(member);
      setMemberData({
        name: member.name,
        nicknames: member.nicknames.join(', ')
      });
    } else {
      setEditMember(null);
      setMemberData({ name: '', nicknames: '' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMember(null);
    setMemberData({ name: '', nicknames: '' });
  };

  const handleSave = () => {
    const data = {
      name: memberData.name,
      nicknames: memberData.nicknames.split(',').map(n => n.trim()).filter(n => n)
    };

    if (editMember) {
      socket.emit('updateTeamMember', { id: editMember.id, ...data });
    } else {
      socket.emit('addTeamMember', data);
    }

    handleClose();
  };

  const handleDelete = (memberId) => {
    if (window.confirm('Are you sure you want to delete this team member?')) {
      socket.emit('deleteTeamMember', { id: memberId });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Team Members</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Member
        </Button>
      </Box>

      <List>
        {members.map((member) => (
          <Paper key={member.id} sx={{ mb: 1 }}>
            <ListItem
              secondaryAction={
                <Box>
                  <IconButton onClick={() => handleOpen(member)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(member.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={member.name}
                secondary={`Nicknames: ${member.nicknames.join(', ')}`}
              />
            </ListItem>
          </Paper>
        ))}
      </List>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {editMember ? 'Edit Team Member' : 'Add Team Member'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={memberData.name}
            onChange={(e) => setMemberData({ ...memberData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Nicknames (comma-separated)"
            fullWidth
            value={memberData.nicknames}
            onChange={(e) => setMemberData({ ...memberData, nicknames: e.target.value })}
            helperText="Enter nicknames separated by commas"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamMembers;
