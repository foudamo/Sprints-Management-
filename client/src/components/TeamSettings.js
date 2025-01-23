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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';

const TeamSettings = ({ teamMembers = [], onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberVariants, setNewMemberVariants] = useState('');

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setEditingMember(null);
    setNewMemberName('');
    setNewMemberVariants('');
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    
    const variants = newMemberVariants.split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
    
    let updatedMembers;
    if (editingMember !== null) {
      // Edit existing member
      updatedMembers = teamMembers.map((member, index) => 
        index === editingMember 
          ? { name: newMemberName, variants }
          : member
      );
    } else {
      // Add new member
      updatedMembers = [...teamMembers, { name: newMemberName, variants }];
    }
    
    onUpdate(updatedMembers);
    setNewMemberName('');
    setNewMemberVariants('');
    setEditingMember(null);
  };

  const handleEditMember = (index) => {
    const member = teamMembers[index];
    setNewMemberName(member.name);
    setNewMemberVariants(member.variants.join(', '));
    setEditingMember(index);
  };

  const handleDeleteMember = (index) => {
    const updatedMembers = teamMembers.filter((_, i) => i !== index);
    onUpdate(updatedMembers);
  };

  return (
    <>
      <IconButton 
        onClick={handleOpen}
        size="small"
        color="primary"
        title="Team Settings"
      >
        <SettingsIcon />
      </IconButton>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Team Settings
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Member Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              margin="normal"
              size="small"
            />
            <TextField
              fullWidth
              label="Name Variants (comma-separated)"
              value={newMemberVariants}
              onChange={(e) => setNewMemberVariants(e.target.value)}
              margin="normal"
              size="small"
              helperText="Add alternative names or nicknames, separated by commas"
            />
            <Button 
              variant="contained" 
              onClick={handleAddMember}
              sx={{ mt: 1 }}
            >
              {editingMember !== null ? 'Update Member' : 'Add Member'}
            </Button>
          </Box>

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Team Members
          </Typography>
          
          <List>
            {teamMembers.map((member, index) => (
              <ListItem 
                key={index}
                sx={{
                  bgcolor: 'background.paper',
                  mb: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ListItemText
                  primary={member.name}
                  secondary={
                    member.variants.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {member.variants.map((variant, i) => (
                          <Chip
                            key={i}
                            label={variant}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    )
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleEditMember(index)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteMember(index)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TeamSettings;
