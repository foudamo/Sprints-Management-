const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const AWS = require('aws-sdk');

const app = express();
const server = http.createServer(app);

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  next();
});

const isDev = process.env.NODE_ENV !== 'production';
const origin = isDev ? 'http://localhost:3000' : true; // Allow any origin in production

const io = new Server(server, {
  cors: {
    origin: origin,
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    path: '/socket.io/',
    serveClient: true,
    cookie: false,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e8,
    allowUpgrades: true,
    wsEngine: 'ws',
    handlePreflightRequest: (req, res) => {
      const headers = {
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Sec-WebSocket-Key, Sec-WebSocket-Protocol, Sec-WebSocket-Version",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": 86400
      };
      res.writeHead(200, headers);
      res.end();
    },
    perMessageDeflate: {
      threshold: 2048,
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      zlibDeflateOptions: {
        level: 6,
        memLevel: 8
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10
    }
  }
});

// Add middleware to log connection attempts
io.use((socket, next) => {
  console.log('Socket connection attempt:', {
    id: socket.id,
    handshake: {
      headers: socket.handshake.headers,
      query: socket.handshake.query,
      auth: socket.handshake.auth
    },
    transport: socket.conn.transport.name
  });
  next();
});

// Add server-wide event listeners
io.engine.on('connection_error', (err) => {
  console.error('Socket.IO connection error:', {
    code: err.code,
    message: err.message,
    context: err.context,
    stack: err.stack
  });
});

app.use(cors({
  origin: origin,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Add CORS preflight handler
app.options('/socket.io/*', cors());

// Health check endpoint - must be before any other routes
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).send('Healthy');
});

// Debug endpoint
app.get('/debug', (req, res) => {
  console.log('Debug endpoint hit');
  const debugInfo = {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    hostname: require('os').hostname(),
    uptime: process.uptime(),
    socketConnections: io.engine.clientsCount,
    aws: {
      region: AWS.config.region,
      credentials: AWS.config.credentials ? 'present' : 'missing'
    }
  };
  
  console.log('Debug info:', debugInfo);
  res.json(debugInfo);
});

// DynamoDB test endpoint
app.get('/debug/dynamodb', async (req, res) => {
  try {
    console.log('Testing DynamoDB connections...');
    const results = await Promise.all([
      dynamodb.scan({ TableName: 'sprints-team-members', Limit: 1 }).promise(),
      dynamodb.scan({ TableName: 'sprints-tasks', Limit: 1 }).promise(),
      dynamodb.scan({ TableName: 'sprints-meeting-notes', Limit: 1 }).promise()
    ]);
    
    res.json({
      success: true,
      teamMembers: results[0],
      tasks: results[1],
      meetingNotes: results[2]
    });
  } catch (error) {
    console.error('DynamoDB test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// Socket.IO test endpoint
app.get('/debug/socket', (req, res) => {
  res.send(`
    <html>
      <body>
        <h2>Socket.IO Test</h2>
        <div id="status">Connecting...</div>
        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          const status = document.getElementById('status');
          
          socket.on('connect', () => {
            status.innerHTML = 'Connected! Socket ID: ' + socket.id;
          });
          
          socket.on('connect_error', (error) => {
            status.innerHTML = 'Connection Error: ' + error;
          });
          
          socket.on('error', (error) => {
            status.innerHTML = 'Socket Error: ' + error;
          });
        </script>
      </body>
    </html>
  `);
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  // API and diagnostic routes first
  app.get(['/api/*', '/socket.io/*', '/health', '/debug'], (req, res, next) => {
    return next();
  });
  
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  // All other routes - serve React app
  app.get('*', (req, res) => {
    console.log('Serving React app for path:', req.url);
    try {
      const indexPath = path.join(__dirname, 'client/build', 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.log('index.html not found at:', indexPath);
        res.status(200).send('Application is running but client files are not available');
      }
    } catch (error) {
      console.error('Error serving index.html:', error);
      res.status(200).send('Application is running');
    }
  });
} else {
  // In development, send a message for root route
  app.get('/', (req, res) => {
    res.send('Server running in development mode');
  });
}

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

// Configure AWS with explicit credentials
AWS.config.update({
  region: process.env.AWS_REGION,
  credentials: new AWS.Credentials({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })
});

// Test AWS configuration
console.log('AWS Configuration:', {
  region: AWS.config.region,
  hasCredentials: !!AWS.config.credentials,
  credentialsExpiration: AWS.config.credentials ? AWS.config.credentials.expireTime : null
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Test DynamoDB connection on startup
async function testDynamoDBConnection() {
  try {
    console.log('Testing DynamoDB connection...');
    const result = await dynamodb.scan({
      TableName: 'sprints-team-members',
      Limit: 1
    }).promise();
    console.log('DynamoDB connection successful:', result);
  } catch (error) {
    console.error('DynamoDB connection error:', error);
  }
}

testDynamoDBConnection();

// Load team members from DynamoDB or use defaults
async function loadTeamMembers() {
  try {
    console.log('Loading team members from DynamoDB...');
    const result = await dynamodb.scan({
      TableName: 'sprints-team-members'
    }).promise();
    
    console.log('Team members loaded:', result.Items);
    if (result.Items.length > 0) {
      return result.Items;
    }
    
    console.log('No team members found, saving defaults...');
    // If no data exists, save defaults
    await saveTeamMembers(DEFAULT_TEAM_MEMBERS);
    return DEFAULT_TEAM_MEMBERS;
  } catch (error) {
    console.error('Error loading team members:', error);
    console.error('Error details:', error.code, error.message);
    return DEFAULT_TEAM_MEMBERS;
  }
}

// Save team members to DynamoDB
async function saveTeamMembers(members) {
  try {
    for (const member of members) {
      await dynamodb.put({
        TableName: 'sprints-team-members',
        Item: member
      }).promise();
    }
  } catch (error) {
    console.error('Error saving team members:', error);
  }
}

// Get current tasks from DynamoDB
async function getCurrentTasks() {
  try {
    const result = await dynamodb.scan({
      TableName: 'sprints-tasks'
    }).promise();
    
    return result.Items.reduce((acc, item) => {
      acc[item.memberName] = {
        name: item.memberName,
        tasks: item.tasks || []
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error loading tasks:', error);
    return {};
  }
}

// Save tasks to DynamoDB
async function saveTasks(tasks) {
  try {
    for (const [memberName, data] of Object.entries(tasks)) {
      await dynamodb.put({
        TableName: 'sprints-tasks',
        Item: {
          memberName,
          tasks: data.tasks || []
        }
      }).promise();
    }
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

// Helper function to generate natural language summary of tasks
function generateTaskSummary(tasks) {
  if (!tasks || tasks.length === 0) {
    return "No tasks scheduled for this period.";
  }

  // Group tasks by common themes/keywords
  const taskThemes = {};
  tasks.forEach(task => {
    const text = task.text.toLowerCase();
    
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
    task.text.toLowerCase().includes('important') || 
    task.text.toLowerCase().includes('priority') ||
    task.text.toLowerCase().includes('urgent')
  );
  
  if (highlights.length > 0) {
    summary += ` Key priorities include: ${highlights.map(t => t.text).join('; ')}.`;
  }

  return summary;
}

// Function to generate report content
function generateReport(tasks, startDate, endDate, memberName = null) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Filter tasks within date range
  const filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.dueDate || task.date);
    return taskDate >= start && taskDate <= end;
  });

  // Sort tasks by date
  filteredTasks.sort((a, b) => {
    const dateA = new Date(a.dueDate || a.date);
    const dateB = new Date(b.dueDate || b.date);
    return dateA - dateB;
  });

  // Group tasks by member
  const tasksByMember = {};
  filteredTasks.forEach(task => {
    const member = task.assignedTo;
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
      const uniqueDates = new Set(tasks.map(task => new Date(task.dueDate || task.date).toLocaleDateString()));
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
      const uniqueDates = new Set(memberTasks.map(task => new Date(task.dueDate || task.date).toLocaleDateString()));
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
      const date = new Date(task.dueDate || task.date).toLocaleDateString();
      if (!tasksByDate[date]) tasksByDate[date] = [];
      tasksByDate[date].push(task);
    });

    Object.entries(tasksByDate).sort(([dateA], [dateB]) => 
      new Date(dateA) - new Date(dateB)
    ).forEach(([date, tasks]) => {
      content += `\n${date}:\n`;
      tasks.forEach(task => {
        content += `- ${task.text}\n`;
      });
    });
  } else {
    // Team-wide report grouped by date
    const tasksByDate = {};
    filteredTasks.forEach(task => {
      const date = new Date(task.dueDate || task.date).toLocaleDateString();
      if (!tasksByDate[date]) tasksByDate[date] = [];
      tasksByDate[date].push(task);
    });

    Object.entries(tasksByDate).sort(([dateA], [dateB]) => 
      new Date(dateA) - new Date(dateB)
    ).forEach(([date, tasks]) => {
      content += `\n${date}:\n`;
      tasks.forEach(task => {
        content += `- [${task.assignedTo}] ${task.text}\n`;
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
  console.log('Client connected:', socket.id);
  console.log('Connection details:', {
    id: socket.id,
    transport: socket.conn.transport.name,
    remoteAddress: socket.handshake.address,
    headers: socket.handshake.headers,
    timestamp: new Date().toISOString()
  });

  // Send initial data on connection
  socket.emit('connection-established', { id: socket.id });

  // Handle reconnection
  socket.on('reconnect', () => {
    console.log('Client reconnected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', {
      id: socket.id,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('connect_timeout', () => {
    console.error('Socket connection timeout:', {
      id: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', {
      id: socket.id,
      reason,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('error', (error) => {
    console.error('Socket error:', {
      id: socket.id,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  // Log socket events for debugging
  socket.onAny((eventName, ...args) => {
    console.log(`Socket event ${eventName} from ${socket.id}:`, JSON.stringify(args, null, 2));
  });

  // Handle get team members request
  socket.on('get-team-members', async () => {
    console.log(`get-team-members requested by ${socket.id}`);
    try {
      const members = await loadTeamMembers();
      console.log('Sending team members:', members);
      socket.emit('team-members', members);
      
      // Also send current tasks when team members are requested
      const currentTasks = await getCurrentTasks();
      console.log('Sending current tasks:', currentTasks);
      socket.emit('parsing-complete', currentTasks);
    } catch (error) {
      console.error('Error in get-team-members:', error);
      socket.emit('error', { message: 'Failed to load team members' });
    }
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
  socket.on('update-tasks', async (tasks) => {
    try {
      console.log('Saving updated tasks:', tasks);
      await saveTasks(tasks);
      io.emit('tasks-updated', tasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  });

  // Handle report export request
  socket.on('export-report', ({ memberId, startDate, endDate }) => {
    try {
      console.log('Generating report:', { memberId, startDate, endDate });
      
      const tasksObj = getCurrentTasks();
      let tasksToReport = [];
      
      if (memberId === 'all') {
        // Collect all tasks from all members
        Object.values(tasksObj).forEach(memberData => {
          if (memberData.tasks && Array.isArray(memberData.tasks)) {
            tasksToReport.push(...memberData.tasks.map(task => ({
              ...task,
              assignedTo: memberData.name
            })));
          }
        });
      } else {
        // Get tasks for specific member
        const memberName = teamMembers[memberId]?.name;
        const memberTasks = tasksObj[memberName]?.tasks || [];
        tasksToReport = memberTasks.map(task => ({
          ...task,
          assignedTo: memberName
        }));
      }
      
      const content = generateReport(tasksToReport, startDate, endDate, memberId === 'all' ? null : teamMembers[memberId]?.name);
      socket.emit('report-generated', { content });
    } catch (error) {
      console.error('Error generating report:', error);
      socket.emit('report-generated', { error: error.message });
    }
  });
});

// Add explicit upgrade handling
server.on('upgrade', (request, socket, head) => {
  console.log('WebSocket upgrade request:', {
    url: request.url,
    headers: request.headers,
    method: request.method,
    timestamp: new Date().toISOString()
  });

  // Validate WebSocket headers
  if (!request.headers['sec-websocket-key']) {
    console.error('Missing Sec-WebSocket-Key header');
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  // Handle WebSocket upgrade
  io.engine.handleUpgrade(request, socket, head);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
