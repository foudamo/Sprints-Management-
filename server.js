const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

const isDev = process.env.NODE_ENV !== 'production';
const origin = isDev ? 'http://localhost:3000' : process.env.VERCEL_URL || 'https://sprints-management.vercel.app';

const io = new Server(server, {
  cors: {
    origin: origin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: origin,
  credentials: true
}));

app.use(express.json());

// Serve static files from the React app in production
if (!isDev) {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Path for storing team members
const TEAM_MEMBERS_PATH = path.join(__dirname, 'team_members.json');
const TASKS_PATH = path.join(__dirname, 'tasks.json');

// Default team members if no saved data exists
const DEFAULT_TEAM_MEMBERS = [
  { id: '1', name: 'Grayson Bass', nicknames: ['grayson', 'grayson bass'] },
  { id: '2', name: 'Zac Waite', nicknames: ['zac', 'zac waite'] },
  { id: '3', name: 'Salman Naqvi', nicknames: ['salman', 'salman naqvi'] },
  { id: '4', name: 'Anmoll', nicknames: ['anmol'] },
  { id: '5', name: 'Dipto Biswas', nicknames: ['dipto', 'dipto biswas'] },
  { id: '6', name: 'Ishu Trivedi', nicknames: ['ishu', 'ishu trivedi'] },
  { id: '7', name: 'Guruprasanna Rajukannan Suresh', nicknames: ['guru'] },
  { id: '8', name: 'Alexa', nicknames: ['alexa'] },
  { id: '9', name: 'Connie', nicknames: ['connie'] },
  { id: '10', name: 'Linh', nicknames: ['linh'] },
  { id: '11', name: 'Hargun', nicknames: ['hargun'] },
  { id: '12', name: 'Mohamed Fouda', nicknames: ['mohamed', 'fouda'] }
];

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
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
  return [];
}

// Save tasks to file
function saveTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

// Initialize team members
let teamMembers = loadTeamMembers();

// Helper function to normalize and match team member names
function normalizeAndMatchName(text) {
  const normalizedText = text.toLowerCase().trim();
  
  // First try to match the exact line
  for (const member of teamMembers) {
    if (member.nicknames.some(variant => normalizedText.includes(variant))) {
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
        if (member.nicknames.some(variant => extractedName.includes(variant))) {
          return member.name;
        }
      }
    }
  }
  
  return null;
}

// Parse text into tasks
async function parseText(data, socket) {
  try {
    const text = data.text;
    const tasks = [];
    const lines = text.split('\n');
    
    let currentDate = null;
    let currentMember = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Try to find team member mention
      for (const member of teamMembers) {
        const memberNameLower = member.name.toLowerCase();
        const nicknamesLower = member.nicknames.map(n => n.toLowerCase());
        
        if (
          trimmedLine.toLowerCase().includes(memberNameLower) ||
          nicknamesLower.some(nickname => trimmedLine.toLowerCase().includes(nickname))
        ) {
          currentMember = member.name;
          break;
        }
      }
      
      // If we found a member and there's a task description
      if (currentMember && trimmedLine.includes(':')) {
        const taskDescription = trimmedLine.split(':')[1].trim();
        if (taskDescription) {
          tasks.push({
            id: Date.now().toString() + tasks.length,
            description: taskDescription,
            assignee: currentMember,
            date: new Date().toISOString().split('T')[0]
          });
        }
      }
    }
    
    return tasks;
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

// Function to generate natural language summary of tasks
function generateTaskSummary(tasks) {
  if (!tasks || tasks.length === 0) {
    return "No tasks scheduled for this period.";
  }

  // Group tasks by common themes/keywords
  const taskThemes = {};
  tasks.forEach(task => {
    const text = task.description.toLowerCase();
    
    // Common task categories
    const categories = {
      meetings: ['meet', 'sync', 'call', 'discussion', 'chat'],
      reviews: ['review', 'feedback', 'check', 'assess'],
      development: ['develop', 'code', 'implement', 'build', 'create', 'fix', 'debug'],
      planning: ['plan', 'strategy', 'roadmap', 'design', 'architect'],
      documentation: ['document', 'write', 'update docs', 'documentation'],
      testing: ['test', 'qa', 'quality', 'verify'],
      deployment: ['deploy', 'release', 'publish', 'ship'],
    };

    // Categorize the task
    let categorized = false;
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        taskThemes[category] = taskThemes[category] || [];
        taskThemes[category].push(task);
        categorized = true;
        break;
      }
    }

    // If task doesn't fit into predefined categories
    if (!categorized) {
      taskThemes.other = taskThemes.other || [];
      taskThemes.other.push(task);
    }
  });

  // Generate natural language summary
  let summary = "";
  const themesFound = Object.entries(taskThemes);
  
  if (themesFound.length === 1) {
    const [category, categoryTasks] = themesFound[0];
    summary = `Their work focuses on ${category} with ${categoryTasks.length} task${categoryTasks.length > 1 ? 's' : ''}.`;
  } else {
    summary = "Their work includes ";
    themesFound.forEach(([category, categoryTasks], index) => {
      if (index === themesFound.length - 1) {
        summary += `and ${category} (${categoryTasks.length} task${categoryTasks.length > 1 ? 's' : ''})`;
      } else {
        summary += `${category} (${categoryTasks.length} task${categoryTasks.length > 1 ? 's' : ''}), `;
      }
    });
    summary += ".";
  }

  // Add key highlights
  const highlights = tasks.filter(task => 
    task.description.toLowerCase().includes('important') || 
    task.description.toLowerCase().includes('priority') ||
    task.description.toLowerCase().includes('urgent')
  );
  
  if (highlights.length > 0) {
    summary += ` Key priorities include: ${highlights.map(t => t.description).join('; ')}.`;
  }

  return summary;
}

// Function to generate report content
function generateReport(tasks, startDate, endDate, memberName = null) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Filter tasks within date range
  const filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.date);
    return taskDate >= start && taskDate <= end;
  });

  // Sort tasks by date
  filteredTasks.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;
  });

  // Group tasks by member
  const tasksByMember = {};
  filteredTasks.forEach(task => {
    const member = task.assignee;
    if (!tasksByMember[member]) {
      tasksByMember[member] = [];
    }
    tasksByMember[member].push(task);
  });

  // Generate report content
  let content = '';
  if (memberName) {
    content += `Task Report for ${memberName}\n`;
  } else {
    content += 'Team Task Report\n';
  }
  content += `Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}\n\n`;

  // Add summary section
  content += 'Summary:\n';
  if (memberName) {
    const tasks = tasksByMember[memberName] || [];
    if (tasks.length === 0) {
      content += `${memberName} has no tasks scheduled during this period.\n`;
    } else {
      content += `${memberName} has ${tasks.length} task${tasks.length === 1 ? '' : 's'} scheduled`;
      const uniqueDates = new Set(tasks.map(task => new Date(task.date).toLocaleDateString()));
      content += ` across ${uniqueDates.size} day${uniqueDates.size === 1 ? '' : 's'}.\n\n`;
      content += `Task Overview:\n${generateTaskSummary(tasks)}\n`;
    }
  } else {
    // Team-wide summary
    const totalTasks = filteredTasks.length;
    const activeMembers = Object.keys(tasksByMember);
    content += `Team Overview:\n`;
    content += `- Total Tasks: ${totalTasks}\n`;
    content += `- Active Team Members: ${activeMembers.length}\n\n`;
    
    // Individual member summaries
    content += 'Member Summaries:\n';
    activeMembers.sort().forEach(member => {
      const memberTasks = tasksByMember[member];
      const uniqueDates = new Set(memberTasks.map(task => new Date(task.date).toLocaleDateString()));
      content += `\n${member}:\n`;
      content += `- Workload: ${memberTasks.length} task${memberTasks.length === 1 ? '' : 's'} across ${uniqueDates.size} day${uniqueDates.size === 1 ? '' : 's'}\n`;
      content += `- Overview: ${generateTaskSummary(memberTasks)}\n`;
    });
  }
  content += '\n';

  // Add detailed task listing
  content += 'Detailed Tasks:\n';
  if (memberName) {
    // Single member report
    const memberTasks = tasksByMember[memberName] || [];
    const tasksByDate = {};
    memberTasks.forEach(task => {
      const date = new Date(task.date).toLocaleDateString();
      if (!tasksByDate[date]) tasksByDate[date] = [];
      tasksByDate[date].push(task);
    });

    Object.entries(tasksByDate).sort(([dateA], [dateB]) => 
      new Date(dateA) - new Date(dateB)
    ).forEach(([date, tasks]) => {
      content += `\n${date}:\n`;
      tasks.forEach(task => {
        content += `- ${task.description}\n`;
      });
    });
  } else {
    // Team-wide report grouped by date
    const tasksByDate = {};
    filteredTasks.forEach(task => {
      const date = new Date(task.date).toLocaleDateString();
      if (!tasksByDate[date]) tasksByDate[date] = [];
      tasksByDate[date].push(task);
    });

    Object.entries(tasksByDate).sort(([dateA], [dateB]) => 
      new Date(dateA) - new Date(dateB)
    ).forEach(([date, tasks]) => {
      content += `\n${date}:\n`;
      tasks.forEach(task => {
        content += `- [${task.assignee}] ${task.description}\n`;
      });
    });
  }

  return content;
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

  // Send initial data
  socket.emit('tasksUpdated', getCurrentTasks());
  socket.emit('teamMembersUpdated', teamMembers);

  // Handle team member operations
  socket.on('getTeamMembers', () => {
    socket.emit('teamMembersUpdated', teamMembers);
  });

  socket.on('addTeamMember', (data) => {
    const newMember = {
      id: Date.now().toString(),
      name: data.name,
      nicknames: data.nicknames
    };
    teamMembers.push(newMember);
    saveTeamMembers(teamMembers);
    io.emit('teamMembersUpdated', teamMembers);
  });

  socket.on('updateTeamMember', (data) => {
    const index = teamMembers.findIndex(m => m.id === data.id);
    if (index !== -1) {
      teamMembers[index] = { ...teamMembers[index], ...data };
      saveTeamMembers(teamMembers);
      io.emit('teamMembersUpdated', teamMembers);
    }
  });

  socket.on('deleteTeamMember', (data) => {
    teamMembers = teamMembers.filter(m => m.id !== data.id);
    saveTeamMembers(teamMembers);
    io.emit('teamMembersUpdated', teamMembers);
  });

  // Handle task operations
  socket.on('addTask', (data) => {
    const tasks = getCurrentTasks();
    const newTask = {
      id: Date.now().toString(),
      description: data.description,
      assignee: data.assignee,
      date: data.date
    };
    tasks.push(newTask);
    saveTasks(tasks);
    io.emit('tasksUpdated', tasks);
  });

  socket.on('updateTask', (data) => {
    const tasks = getCurrentTasks();
    const index = tasks.findIndex(t => t.id === data.id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...data };
      saveTasks(tasks);
      io.emit('tasksUpdated', tasks);
    }
  });

  socket.on('deleteTask', (data) => {
    let tasks = getCurrentTasks();
    tasks = tasks.filter(t => t.id !== data.id);
    saveTasks(tasks);
    io.emit('tasksUpdated', tasks);
  });

  // Handle text parsing
  socket.on('parseText', async (data) => {
    try {
      const parsedTasks = await parseText(data, socket);
      saveTasks(parsedTasks);
      io.emit('tasksUpdated', parsedTasks);
      socket.emit('textParsed', { success: true });
    } catch (error) {
      console.error('Error parsing text:', error);
      socket.emit('textParsed', { success: false, error: error.message });
    }
  });

  // Handle report generation
  socket.on('generateReport', (data) => {
    try {
      const tasks = getCurrentTasks();
      const content = generateReport(tasks, data.startDate, data.endDate, data.teamMember);
      socket.emit('reportGenerated', { content });
    } catch (error) {
      console.error('Error generating report:', error);
      socket.emit('reportGenerated', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Handle React routing in production
if (!isDev) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Consider adding database integration
mongoose.connect(process.env.MONGODB_URI);

// Add proper error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Add rate limiting and security headers
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
}));
