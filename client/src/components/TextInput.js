import React, { useState, useEffect, useRef } from 'react';
import { TextField, Box } from '@mui/material';

function TextInput({ initialValue = '', onSubmit, onCancel }) {
  const [text, setText] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    onSubmit(text);
    setText('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      <TextField
        ref={inputRef}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyPress}
        onBlur={onCancel}
        placeholder="Enter task..."
        size="small"
        autoFocus
      />
    </Box>
  );
}

export default TextInput;
