const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Default team members if no saved data exists
const DEFAULT_TEAM_MEMBERS = [
  {
    name: 'Grayson Bass',
    variants: ['grayson', 'grayson bass']
  },
  {
    name: 'Zac Waite',
    variants: ['zac', 'zac waite', 'zach']
  },
  {
    name: 'Salman Naqvi',
    variants: ['salman', 'salman naqvi']
  },
  {
    name: 'Anmoll',
    variants: ['anmol', 'anmoll']
  },
  {
    name: 'Dipto Biswas',
    variants: ['dipto', 'dipto biswas']
  },
  {
    name: 'Ishu Trivedi',
    variants: ['ishu', 'ishu trivedi']
  },
  {
    name: 'Guruprasanna Rajukannan Suresh',
    variants: ['guru', 'guruprasanna', 'guruprasanna rajukannan suresh']
  },
  {
    name: 'Alexa',
    variants: ['alexa']
  },
  {
    name: 'Connie',
    variants: ['connie']
  },
  {
    name: 'Linh',
    variants: ['linh']
  },
  {
    name: 'Hargun',
    variants: ['hargun']
  },
  {
    name: 'Mohamed Fouda',
    variants: ['mohamed', 'mohamed fouda', 'fouda']
  }
];

// Path to store team members data
const TEAM_MEMBERS_PATH = path.join(__dirname, 'team_members.json');

// Path for storing current tasks
const TASKS_PATH = path.join(__dirname, 'current_tasks.json');

// Path for storing original texts
const ORIGINAL_TEXTS_PATH = path.join(__dirname, 'original_texts.json');

// Load team members from file or use defaults
function loadTeamMembers() {
  try {
    if (fs.existsSync(TEAM_MEMBERS_PATH)) {
      const data = fs.readFileSync(TEAM_MEMBERS_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading team members:', error);
  }
  return DEFAULT_TEAM_MEMBERS;
}

// Save team members to file
function saveTeamMembers(members) {
  try {
    fs.writeFileSync(TEAM_MEMBERS_PATH, JSON.stringify(members, null, 2));
  } catch (error) {
    console.error('Error saving team members:', error);
  }
}

// Get current tasks from file
function getCurrentTasks() {
  try {
    if (fs.existsSync(TASKS_PATH)) {
      const data = fs.readFileSync(TASKS_PATH, 'utf8');
      const tasks = JSON.parse(data);
      
      // Initialize empty tasks object if needed
      const result = {};
      teamMembers.forEach(member => {
        result[member.name] = {
          name: member.name,
          tasks: tasks[member.name]?.tasks || []
        };
      });
      return result;
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
  
  // Return initialized empty tasks object
  const result = {};
  teamMembers.forEach(member => {
    result[member.name] = {
      name: member.name,
      tasks: []
    };
  });
  return result;
}

// Save tasks to file
function saveTasks(tasks) {
  try {
    // Ensure tasks object has proper structure
    const formattedTasks = {};
    Object.keys(tasks).forEach(memberName => {
      formattedTasks[memberName] = {
        name: memberName,
        tasks: tasks[memberName].tasks.map(task => ({
          text: task.text,
          dueDate: task.dueDate,
          assignedTo: task.assignedTo || memberName,
          timestamp: task.timestamp
        }))
      };
    });
    
    fs.writeFileSync(TASKS_PATH, JSON.stringify(formattedTasks, null, 2));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

// Get original texts from file
function getOriginalTexts() {
  try {
    if (fs.existsSync(ORIGINAL_TEXTS_PATH)) {
      const data = fs.readFileSync(ORIGINAL_TEXTS_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading original texts:', error);
  }
  return {};
}

// Save original text to file
function saveOriginalText(date, text) {
  try {
    const texts = getOriginalTexts();
    texts[date] = text;
    fs.writeFileSync(ORIGINAL_TEXTS_PATH, JSON.stringify(texts, null, 2));
  } catch (error) {
    console.error('Error saving original text:', error);
  }
}

// Initialize team members
let teamMembers = loadTeamMembers();

// Helper function to normalize and match team member names
function normalizeAndMatchName(text) {
  const normalizedText = text.toLowerCase().trim();
  
  // First try to match the exact line
  for (const member of teamMembers) {
    if (member.variants.some(variant => normalizedText.includes(variant))) {
      return member.name;
    }
  }
  
  // If no match found, try to extract name from common patterns
  const patterns = [
    /^([A-Za-z]+ ?[A-Za-z]*)(:|$|\s+will|\s+to|\s+is|\s+has|\s+plans)/i,  // Name followed by : or end of line or common words
    /^([A-Za-z]+ ?[A-Za-z]*)\s*(?:\(|-)/, // Name followed by ( or -
    /^([A-Za-z]+ ?[A-Za-z]*):?\s+(?:working|continuing|finishing|exploring|preparing)/i // Name followed by action verbs
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const extractedName = match[1].toLowerCase().trim();
      for (const member of teamMembers) {
        if (member.variants.some(variant => extractedName.includes(variant))) {
          return member.name;
        }
      }
    }
  }
  
  return null;
}

// Function to parse text directly
function parseText(data, socket) {
  try {
    socket.emit('parsing-progress', { stage: 'Starting text parsing...', progress: 10 });

    // Get existing tasks
    const existingTasks = getCurrentTasks();
    
    // Initialize the result object with existing tasks for the current date
    const result = {};
    Object.keys(existingTasks).forEach(memberName => {
      result[memberName] = {
        name: memberName,
        tasks: existingTasks[memberName].tasks.filter(task => {
          const taskDate = new Date(task.dueDate);
          const selectedDate = new Date(data.selectedDate);
          return taskDate.getTime() !== selectedDate.getTime();
        })
      };
    });

    // Split the text into lines and find the "Action items" section
    const lines = data.text.split('\n');
    let actionItemsIndex = -1;

    socket.emit('parsing-progress', { stage: 'Looking for Action Items section...', progress: 20 });

    // Find the "Action items" section
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('action items')) {
        actionItemsIndex = i;
        break;
      }
    }

    // If we didn't find the Action Items section, return existing tasks
    if (actionItemsIndex === -1) {
      socket.emit('parsing-progress', { stage: 'No Action Items section found', progress: 100 });
      return result;
    }

    socket.emit('parsing-progress', { stage: 'Found Action Items section, processing tasks...', progress: 30 });

    // Process lines after "Action items"
    const startIndex = actionItemsIndex + 1;
    let currentMember = null;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if we've reached the end of the action items section
      if (line.toLowerCase().includes('next steps') || 
          line.toLowerCase().includes('next meeting') ||
          line.toLowerCase().includes('discussion items')) {
        break;
      }

      // First check if this line is a member name
      let foundMember = null;
      for (const member of teamMembers) {
        const variations = [member.name, ...(member.variants || [])];
        for (const variation of variations) {
          if (line.toLowerCase() === variation.toLowerCase()) {
            foundMember = member;
            break;
          }
        }
        if (foundMember) break;
      }

      if (foundMember) {
        // This line is a member name, set as current member
        currentMember = foundMember;
        continue;
      }

      // If we have a current member and this isn't a member name, it's their task
      if (currentMember && line) {
        // Extract timestamp if present (HH:MM) or (H:MM)
        const timestampMatch = line.match(/\((\d{1,2}:\d{2})\)/);
        const taskText = line.replace(/\(\d{1,2}:\d{2}\)/, '').trim();

        if (taskText) {
          const task = {
            text: taskText,
            dueDate: data.selectedDate,
            assignedTo: currentMember.name,
            timestamp: timestampMatch ? timestampMatch[1] : null
          };
          
          // Initialize member's tasks array if needed
          if (!result[currentMember.name]) {
            result[currentMember.name] = {
              name: currentMember.name,
              tasks: []
            };
          }
          result[currentMember.name].tasks.push(task);
        }
      }
    }

    socket.emit('parsing-progress', { stage: 'Finalizing results...', progress: 90 });
    
    return result;
  } catch (error) {
    console.error('Error parsing text:', error);
    throw error;
  }
}

// Function to parse text and extract tasks
async function parseDocx(socket) {
  try {
    console.log('Starting document parsing...');
    socket?.emit('parsing-progress', { 
      stage: 'Reading document', 
      progress: 10 
    });

    const textPath = path.join(__dirname, 'Summary.txt');
    console.log('Reading from:', textPath);
    
    if (!fs.existsSync(textPath)) {
      throw new Error('Summary.txt not found');
    }

    const content = await fs.promises.readFile(textPath, 'utf8');
    console.log('File size:', content.length, 'bytes');

    if (!content) {
      throw new Error('No content found in document');
    }

    socket?.emit('parsing-progress', { 
      stage: 'Analyzing content', 
      progress: 30 
    });

    // Find the Action items section
    const actionItemsMatch = content.match(/Action items\n([\s\S]*?)(?:\n\s*\n|$)/i);
    
    if (!actionItemsMatch) {
      throw new Error('No action items section found');
    }

    const actionItemsSection = actionItemsMatch[1];
    console.log('Found Action Items section');

    socket?.emit('parsing-progress', { 
      stage: 'Extracting tasks', 
      progress: 50 
    });

    const tasksByMember = {};
    let currentMember = null;

    // Split into lines and process
    const lines = actionItemsSection.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Check if this line is a member name
      const memberName = normalizeAndMatchName(trimmedLine);
      
      if (memberName) {
        currentMember = memberName;
        if (!tasksByMember[currentMember]) {
          tasksByMember[currentMember] = [];
        }
        continue;
      }

      // If we have a current member and this isn't a member name, it's a task
      if (currentMember) {
        // Remove any leading bullet points or dashes, but keep timestamps
        const task = trimmedLine.replace(/^[•-]\s*/, '').trim();
        
        // Only add non-empty tasks that aren't duplicates
        if (task && task.length > 0 && !tasksByMember[currentMember].includes(task)) {
          tasksByMember[currentMember].push(task);
        }
      }
    }

    socket?.emit('parsing-progress', { 
      stage: 'Organizing tasks', 
      progress: 80 
    });

    // Transform into the expected format
    const members = Object.entries(tasksByMember)
      .filter(([name, tasks]) => tasks.length > 0) // Only include members with tasks
      .map(([name, tasks]) => ({
        name,
        tasks
      }));

    if (members.length === 0) {
      throw new Error('No tasks found in document');
    }

    console.log('Parsed members:', JSON.stringify(members, null, 2));

    socket?.emit('parsing-progress', { 
      stage: 'Completed', 
      progress: 100 
    });

    return members;
  } catch (error) {
    console.error('Error parsing document:', error);
    throw error;
  }
}

app.post('/api/demo', async (req, res) => {
  try {
    const socketId = req.headers['socket-id'];
    const socket = io.sockets.sockets.get(socketId);
    
    console.log('Demo request received. Socket ID:', socketId);
    
    // Parse the document
    const members = await parseDocx(socket);
    
    console.log('Sending response:', JSON.stringify({ success: true, data: { members } }, null, 2));
    
    // Return the parsed data
    res.json({
      success: true,
      data: { members }
    });
  } catch (error) {
    console.error('Error in demo:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');

  // Handle get team members request
  socket.on('get-team-members', () => {
    socket.emit('team-members', teamMembers);
    // Also send current tasks when team members are requested
    const currentTasks = getCurrentTasks();
    socket.emit('parsing-complete', currentTasks);
  });

  // Handle text parsing request
  socket.on('parse-text', async (data) => {
    try {
      console.log('Received text to parse:', data);
      const parsedTasks = await parseText(data, socket);
      console.log('Parsed tasks:', parsedTasks);
      
      // Save the original text
      saveOriginalText(data.selectedDate, data.text);
      
      // Save the tasks
      saveTasks(parsedTasks);
      
      // Send the parsed tasks back to the client
      socket.emit('parsing-complete', parsedTasks);
    } catch (error) {
      console.error('Error parsing text:', error);
      socket.emit('parsing-error', { message: error.message });
    }
  });

  // Handle get original text request
  socket.on('get-original-text', (date) => {
    try {
      const texts = getOriginalTexts();
      const text = texts[date] || '';
      socket.emit('original-text', { date, text });
    } catch (error) {
      console.error('Error getting original text:', error);
      socket.emit('original-text-error', { message: error.message });
    }
  });

  // Handle task updates
  socket.on('update-tasks', (tasks) => {
    try {
      console.log('Saving updated tasks:', tasks);
      saveTasks(tasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
