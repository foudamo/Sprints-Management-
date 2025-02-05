const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');
const { sequelize, initModels } = require('./db');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Socket.IO configuration
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: false
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket']
});

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const isDev = process.env.NODE_ENV !== 'production';

// Initialize models
const { TeamMember, Task, ParsedText } = initModels();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Serve static files from the React app in production
if (!isDev) {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// PostgreSQL Configuration
const sequelizeConfig = new Sequelize('postgres://postgres:BzfZEbT6M1rYNP7ouy0e@sprints-mohamed-fouda.cj24eucoaq0n.us-east-1.rds.amazonaws.com:5432/sprints', {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    statement_timeout: 30000, // 30 seconds
    idle_in_transaction_session_timeout: 30000 // 30 seconds
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 3,
    timeout: 30000
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  try {
    // Send initial data to the client
    const sendInitialData = async () => {
      try {
        const [members, tasks] = await Promise.all([
          TeamMember.findAll(),
          Task.findAll({
            include: [{
              model: TeamMember,
              as: 'assignedMember',
              attributes: ['id', 'name']
            }]
          })
        ]);
        
        console.log('Sending initial data to client');
        socket.emit('members', members);
        socket.emit('tasks', tasks);
      } catch (error) {
        console.error('Error sending initial data:', error);
        socket.emit('error', { message: 'Failed to load initial data' });
      }
    };

    socket.on('request_initial_data', sendInitialData);
    sendInitialData(); // Send data on initial connection

    // Handle member events
    socket.on('add_member', async (data) => {
      try {
        console.log('Adding new member:', data);
        const member = await TeamMember.create({
          id: uuidv4(),
          name: data.name.trim(),
          role: data.role?.trim() || 'Developer',
          nicknames: data.nicknames || []
        });

        const newMember = member.toJSON();
        console.log('Created member:', newMember);
        io.emit('member_added', newMember);
      } catch (error) {
        console.error('Error adding member:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('update_member', async (data) => {
      try {
        console.log('Updating member:', data);
        await TeamMember.update(
          {
            name: data.name?.trim(),
            role: data.role?.trim(),
            nicknames: data.nicknames
          },
          { where: { id: data.id } }
        );

        const updated = await TeamMember.findByPk(data.id);
        if (updated) {
          const updatedMember = updated.toJSON();
          console.log('Updated member:', updatedMember);
          io.emit('member_updated', updatedMember);
        }
      } catch (error) {
        console.error('Error updating member:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('delete_member', async (memberId) => {
      try {
        console.log('Deleting member:', memberId);
        const deleted = await TeamMember.destroy({ where: { id: memberId } });
        if (deleted) {
          console.log('Deleted member:', memberId);
          io.emit('member_deleted', memberId);
        }
      } catch (error) {
        console.error('Error deleting member:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle task events
    socket.on('add_task', async (data) => {
      try {
        console.log('Starting task creation:', data);
        
        // Validate input data
        if (!data.title || !data.assignedTo) {
          throw new Error('Title and assignedTo are required');
        }
        
        console.log('Creating task in database...');
        const task = await Task.create({
          id: uuidv4(),
          title: data.title.trim(),
          description: data.description || '',
          assignedTo: data.assignedTo,
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          dueDate: data.dueDate
        }).catch(err => {
          console.error('Database error during task creation:', err);
          throw err;
        });

        console.log('Task created, fetching with associations...');
        const taskWithAssignee = await Task.findByPk(task.id).catch(err => {
          console.error('Error fetching created task:', err);
          throw err;
        });

        // Send both events to ensure client receives the response
        console.log('Emitting task_added event...');
        io.emit('task_added', taskWithAssignee);
        socket.emit('task_save_success', taskWithAssignee);
        
        console.log('Task added successfully:', taskWithAssignee.toJSON());
      } catch (error) {
        console.error('Error in add_task handler:', error);
        socket.emit('error', { 
          message: error.message,
          details: error.toString(),
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('update_task', async (data) => {
      try {
        console.log('Starting task update:', data);
        
        if (!data.id) {
          throw new Error('Task ID is required for update');
        }
        
        console.log('Updating task in database...');
        await Task.update({
          title: data.title?.trim(),
          description: data.description,
          assignedTo: data.assignedTo,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate
        }, {
          where: { id: data.id }
        }).catch(err => {
          console.error('Database error during task update:', err);
          throw err;
        });

        console.log('Task updated, fetching latest version...');
        const updated = await Task.findByPk(data.id).catch(err => {
          console.error('Error fetching updated task:', err);
          throw err;
        });

        if (!updated) {
          throw new Error('Task not found after update');
        }

        console.log('Emitting task_updated event...');
        io.emit('task_updated', updated);
        socket.emit('task_save_success', updated);
        
        console.log('Task updated successfully:', updated.toJSON());
      } catch (error) {
        console.error('Error in update_task handler:', error);
        socket.emit('error', { 
          message: error.message,
          details: error.toString(),
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('delete_task', async (taskId) => {
      try {
        console.log('Deleting task:', taskId);
        await Task.destroy({
          where: { id: taskId }
        });
        io.emit('task_deleted', taskId);
        console.log('Task deleted:', taskId);
      } catch (error) {
        console.error('Error deleting task:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle text parsing
    socket.on('parse_text', async (data) => {
      try {
        console.log('Starting text parsing:', data);
        if (!data.text) {
          throw new Error('No text provided for parsing');
        }
        
        await parseText(data.text, socket, data.taskDate);
        
      } catch (error) {
        console.error('Error parsing text:', error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('generateReport', async (data, callback) => {
      console.log('Received generateReport request:', data);
      
      try {
        if (!data || !data.startDate || !data.endDate) {
          console.error('Invalid report data received:', data);
          socket.emit('error', { message: 'Invalid report data: missing dates' });
          if (callback) callback({ success: false, error: 'Invalid report data' });
          return;
        }

        console.log('Generating report with data:', {
          startDate: new Date(data.startDate).toISOString(),
          endDate: new Date(data.endDate).toISOString(),
          teamMember: data.teamMember
        });

        // Get all team members for mapping IDs to names
        console.log('Fetching team members...');
        const teamMembers = await TeamMember.findAll({
          raw: true,
          logging: console.log
        });
        console.log('Found team members:', teamMembers);
        
        const memberMap = {};
        teamMembers.forEach(member => {
          memberMap[member.id] = member.name;
        });
        console.log('Created member map:', memberMap);

        // Build the query conditions
        const whereConditions = {
          dueDate: {
            [Sequelize.Op.between]: [new Date(data.startDate), new Date(data.endDate)]
          }
        };
        console.log('Query conditions:', JSON.stringify(whereConditions, null, 2));

        // Add team member filter if specified
        if (data.teamMember && data.teamMember !== 'all') {
          const selectedMember = teamMembers.find(m => m.name === data.teamMember);
          if (selectedMember) {
            whereConditions.assignedTo = selectedMember.id;
            console.log('Added team member filter:', selectedMember.id);
          }
        }

        // Fetch tasks with their assigned team members
        console.log('Fetching tasks with conditions:', JSON.stringify(whereConditions, null, 2));
        const tasks = await Task.findAll({
          where: whereConditions,
          include: [{
            model: TeamMember,
            as: 'assignedMember',
            attributes: ['id', 'name'],
            required: false
          }],
          order: [['dueDate', 'ASC']],
          logging: console.log
        });
        
        console.log('Found tasks:', tasks.length);
        if (tasks.length > 0) {
          console.log('Sample task:', JSON.stringify(tasks[0].get({ plain: true }), null, 2));
        }

        // Generate and send the report
        const reportContent = generateReportContent(tasks, data.startDate, data.endDate);
        console.log('Generated report content length:', reportContent.length);
        
        const response = {
          content: reportContent,
          downloadFilename: `task_report_${new Date(data.startDate).toISOString().split('T')[0]}_to_${new Date(data.endDate).toISOString().split('T')[0]}.txt`
        };
        
        console.log('Sending report to client');
        socket.emit('reportGenerated', response);
        if (callback) callback({ success: true });
        
      } catch (error) {
        console.error('Error generating report:', error);
        console.error('Error stack:', error.stack);
        socket.emit('error', { 
          message: 'Failed to generate report: ' + error.message,
          details: error.toString()
        });
        if (callback) callback({ success: false, error: error.message });
      }
    });

  } catch (error) {
    console.error('Socket error:', error);
    socket.emit('error', { message: error.message });
  }
});

// Parse text into tasks
async function parseText(text, socket, taskDate = new Date()) {
  try {
    console.log('Starting text parsing...', { taskDate });
    socket?.emit('parsing_status', { status: 'started', message: 'Starting text parsing...' });

    // Create the parsed text entry first
    const parsedText = await ParsedText.create({
      id: uuidv4(),
      rawText: text,
      taskDate: taskDate,
      parsedDate: new Date()
    });
    console.log('Created ParsedText:', parsedText.id);

    const lines = text.split('\n');
    let tasks = [];
    let currentMember = null;
    let isInActionItems = false;
    let isInTeamUpdates = false;
    let taskBuffer = [];
    
    socket?.emit('parsing_status', { status: 'processing', message: 'Analyzing text...' });

    // Get all team members once
    const members = await TeamMember.findAll();
    
    // Helper function to clean task description
    const cleanTaskDescription = (text) => {
      // If it's just a timestamp, return empty
      if (text.match(/^\d{2}:\d{2}$/) || text.match(/^\d{2}\s*-\s*\d{2}:\d{2}$/)) {
        return '';
      }

      return text
        // Remove timestamps at the end of lines
        .replace(/\s*\(\d{2}:\d{2}\)\s*$/, '')
        // Remove timestamp prefixes while preserving the rest of the line
        .replace(/^\d{2}\s*-\s*\d{2}:\d{2}\s*[:,-]?\s*/, '')
        // Remove bullet points and numbers at start
        .replace(/^[-•*]|\d+[\.)]\s*/, '')
        // Clean up any double spaces
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Helper function to create task for member
    const createTaskForMember = async (member, description) => {
      if (!description) return null;
      
      const cleanedDescription = cleanTaskDescription(description);
      if (!cleanedDescription) return null;

      console.log('Creating task for:', member.name, 'Description:', cleanedDescription);
      const task = await Task.create({
        id: uuidv4(),
        title: cleanedDescription.substring(0, Math.min(255, cleanedDescription.length)),
        description: cleanedDescription,
        assignedTo: member.id,
        status: 'todo',
        priority: 'medium',
        parsedTextId: parsedText.id,
        dueDate: taskDate
      });
      return task;
    };

    // Process shared tasks mentioned in Team Updates
    const processSharedTasks = async (line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const beforeColon = line.substring(0, colonIndex).toLowerCase();
      const afterColon = line.substring(colonIndex + 1).trim();

      // Find all members mentioned before the colon
      const mentionedMembers = members.filter(member => {
        const memberNameLower = member.name.toLowerCase();
        const nicknamesLower = member.nicknames || [];
        return beforeColon.includes(memberNameLower) ||
               nicknamesLower.some(nickname => beforeColon.includes(nickname.toLowerCase()));
      });

      if (mentionedMembers.length > 0 && afterColon) {
        for (const member of mentionedMembers) {
          const task = await createTaskForMember(member, afterColon);
          if (task) tasks.push(task);
        }
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine) continue;

      // Check for section headers
      if (trimmedLine.toLowerCase() === 'action items') {
        isInActionItems = true;
        isInTeamUpdates = false;
        continue;
      } else if (trimmedLine.toLowerCase().includes('team updates and tasks')) {
        isInTeamUpdates = true;
        isInActionItems = false;
        continue;
      }

      // In Team Updates section, look for shared tasks
      if (isInTeamUpdates && trimmedLine.includes(':')) {
        await processSharedTasks(trimmedLine);
        continue;
      }

      // In Action Items section, look for member names and their tasks
      if (isInActionItems) {
        // Try to find team member mention at the start of a line
        let foundMember = null;
        for (const member of members) {
          const memberNameLower = member.name.toLowerCase();
          if (trimmedLine.toLowerCase().startsWith(memberNameLower)) {
            foundMember = member;
            break;
          }
        }

        // If we found a member
        if (foundMember) {
          // Process any buffered task for the previous member
          if (taskBuffer.length > 0 && currentMember) {
            const taskDescription = taskBuffer.join(' ').trim();
            if (taskDescription) {
              const task = await createTaskForMember(currentMember, taskDescription);
              if (task) tasks.push(task);
            }
          }
          
          currentMember = foundMember;
          taskBuffer = [];
          continue;
        }

        // If we have a current member and this line might be a task
        if (currentMember && trimmedLine) {
          // Skip if it's just the member's name
          if (!trimmedLine.toLowerCase().startsWith(currentMember.name.toLowerCase())) {
            taskBuffer.push(trimmedLine);
          }
        }
      }
    }

    // Process any remaining buffered task
    if (taskBuffer.length > 0 && currentMember) {
      const taskDescription = taskBuffer.join(' ').trim();
      if (taskDescription) {
        const task = await createTaskForMember(currentMember, taskDescription);
        if (task) tasks.push(task);
      }
    }

    socket?.emit('parsing_status', { status: 'saving', message: 'Saving tasks...' });

    // Fetch all created tasks with member data
    const allTasks = await Task.findAll({
      include: [{
        model: TeamMember,
        as: 'assignedMember',
        attributes: ['id', 'name']
      }],
      order: [['dueDate', 'ASC']]
    });

    // Emit both the parsing completion and updated tasks
    socket?.emit('parsing_status', { status: 'completed', message: 'Text parsing completed' });
    io.emit('tasks_updated', allTasks);

    return allTasks;
  } catch (error) {
    console.error('Error parsing text:', error);
    socket?.emit('parsing_status', { status: 'error', message: error.message });
    throw error;
  }
}

// Helper function to generate narrative summary
function generatePersonalSummary(memberName, tasks) {
  if (tasks.length === 0) {
    return `${memberName} had no recorded tasks during this period.`;
  }

  // Analyze tasks to identify themes and patterns
  const taskThemes = {
    meetings: tasks.filter(t => 
      t.title.toLowerCase().includes('meeting') || 
      t.title.toLowerCase().includes('discuss')),
    stakeholders: tasks.filter(t => 
      t.title.toLowerCase().includes('stakeholder') || 
      t.title.toLowerCase().includes('client') ||
      t.title.toLowerCase().includes('partner')),
    development: tasks.filter(t => 
      t.title.toLowerCase().includes('develop') || 
      t.title.toLowerCase().includes('implement') ||
      t.title.toLowerCase().includes('build')),
    planning: tasks.filter(t => 
      t.title.toLowerCase().includes('plan') || 
      t.title.toLowerCase().includes('prepare') ||
      t.title.toLowerCase().includes('strategy')),
    review: tasks.filter(t => 
      t.title.toLowerCase().includes('review') || 
      t.title.toLowerCase().includes('feedback'))
  };

  // Determine main focus areas
  const focusAreas = Object.entries(taskThemes)
    .filter(([_, tasks]) => tasks.length > 0)
    .map(([area]) => area);

  // Generate narrative summary
  let summary = `${memberName} focused on `;
  
  if (focusAreas.length === 0) {
    summary += 'various tasks';
  } else if (focusAreas.length === 1) {
    summary += `${formatFocusArea(focusAreas[0])}`;
  } else {
    const lastArea = focusAreas.pop();
    summary += `${focusAreas.map(formatFocusArea).join(', ')} and ${formatFocusArea(lastArea)}`;
  }

  // Add specific details
  if (taskThemes.meetings.length > 0) {
    summary += `, organized meetings with ${getStakeholderContext(tasks)}`;
  }
  if (taskThemes.development.length > 0) {
    summary += `, guided development initiatives`;
  }
  if (taskThemes.stakeholders.length > 0) {
    summary += `, addressed stakeholder feedback`;
  }

  // Add impact statement
  summary += `. His contributions supported the team's sprint objectives.`;

  return summary;
}

// Helper function to format focus areas
function formatFocusArea(area) {
  switch (area) {
    case 'meetings': return 'team collaboration and alignment';
    case 'stakeholders': return 'stakeholder engagement';
    case 'development': return 'technical development and implementation';
    case 'planning': return 'strategic planning and prioritization';
    case 'review': return 'review and feedback';
    default: return area;
  }
}

// Helper function to get stakeholder context
function getStakeholderContext(tasks) {
  const contexts = new Set(tasks
    .filter(t => t.title.toLowerCase().includes('meeting'))
    .map(t => {
      const title = t.title.toLowerCase();
      if (title.includes('un team')) return 'the UN Team';
      if (title.includes('stakeholder')) return 'key stakeholders';
      if (title.includes('client')) return 'clients';
      return 'team members';
    }));
  return Array.from(contexts).join(' and ');
}

// Generate report content
function generateReportContent(tasks, startDate, endDate) {
  let reportContent = `Task Report\n`;
  reportContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
  reportContent += `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}\n\n`;

  // Group tasks by member
  const tasksByMember = {};
  tasks.forEach(task => {
    const memberName = task.assignedMember ? task.assignedMember.name : 'Unassigned';
    if (!tasksByMember[memberName]) {
      tasksByMember[memberName] = [];
    }
    tasksByMember[memberName].push(task);
  });

  // Generate individual member sections
  Object.entries(tasksByMember).forEach(([memberName, memberTasks]) => {
    reportContent += `${memberName}'s Tasks:\n`;
    reportContent += `Summary:\n`;
    reportContent += generatePersonalSummary(memberName, memberTasks) + '\n\n';
    reportContent += `Detailed Task List:\n`;

    // Group tasks by date
    const tasksByDate = {};
    memberTasks.forEach(task => {
      const date = new Date(task.dueDate).toLocaleDateString();
      if (!tasksByDate[date]) tasksByDate[date] = [];
      tasksByDate[date].push(task);
    });

    // Output tasks grouped by date
    Object.entries(tasksByDate)
      .sort(([dateA, _], [dateB, __]) => new Date(dateA) - new Date(dateB))
      .forEach(([date, dateTasks]) => {
        reportContent += `\n${date}:\n`;
        dateTasks.forEach(task => {
          reportContent += `    - ${task.title}\n`;
          if (task.description) {
            reportContent += `      ${task.description}\n`;
          }
        });
      });

    reportContent += '\n';
  });

  // Generate team summary
  reportContent += `Team Summary:\n`;
  const totalTasks = tasks.length;
  const daysInPeriod = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));

  let teamSummary = `Over this ${daysInPeriod}-day period, the team focused on `;
  
  // Analyze overall team focus
  const allTaskThemes = {
    development: tasks.filter(t => 
      t.title.toLowerCase().includes('develop') || 
      t.title.toLowerCase().includes('implement')).length,
    planning: tasks.filter(t => 
      t.title.toLowerCase().includes('plan') || 
      t.title.toLowerCase().includes('strategy')).length,
    stakeholder: tasks.filter(t => 
      t.title.toLowerCase().includes('stakeholder') || 
      t.title.toLowerCase().includes('client')).length
  };

  const mainThemes = Object.entries(allTaskThemes)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 2)
    .map(([theme]) => {
      switch (theme) {
        case 'development': return 'technical development';
        case 'planning': return 'strategic planning';
        case 'stakeholder': return 'stakeholder engagement';
        default: return theme;
      }
    });

  teamSummary += mainThemes.join(' and ') + '. ';
  teamSummary += `Key accomplishments included platform improvements, stakeholder feedback integration, and progress on sprint deliverables. `;
  teamSummary += `The team demonstrated strong collaboration and maintained focus on critical objectives.\n\n`;

  reportContent += teamSummary;

  // Add individual contributions summary
  reportContent += `Individual Contributions:\n`;
  Object.entries(tasksByMember).forEach(([memberName, memberTasks]) => {
    const contribution = memberTasks.length / totalTasks * 100;
    reportContent += `- ${memberName}: ${memberTasks.length} tasks (${contribution.toFixed(1)}%)\n`;
  });

  return reportContent;
}

// HTTP endpoints for testing
app.get('/api/members', async (req, res) => {
  try {
    const members = await TeamMember.findAll();
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.findAll();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  try {
    // Test database connection
    await sequelizeConfig.authenticate();
    console.log('Database connection established successfully');
    console.log(`Server running on port ${PORT}`);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});