const { Sequelize } = require('sequelize');
const config = require('./database/config/config');
const { v4: uuidv4 } = require('uuid');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.url, {
  ...dbConfig,
  logging: console.log
});

const teamMembers = [
  { id: uuidv4(), name: 'Grayson Bass', role: 'Developer', variations: ['Gray', 'GB'], active: true },
  { id: uuidv4(), name: 'Zac Waite', role: 'Developer', variations: ['Zack', 'ZW'], active: true },
  { id: uuidv4(), name: 'Salman Naqvi', role: 'Developer', variations: ['Sal', 'SN'], active: true },
  { id: uuidv4(), name: 'Anmoll', role: 'Developer', variations: [], active: true },
  { id: uuidv4(), name: 'Dipto Biswas', role: 'Developer', variations: ['DB'], active: true },
  { id: uuidv4(), name: 'Ishu Trivedi', role: 'Developer', variations: ['IT'], active: true },
  { id: uuidv4(), name: 'Guruprasanna Rajukannan Suresh', role: 'Developer', variations: ['Guru', 'GRS'], active: true },
  { id: uuidv4(), name: 'Alexa', role: 'Product Manager', variations: [], active: true },
  { id: uuidv4(), name: 'Connie', role: 'Designer', variations: [], active: true },
  { id: uuidv4(), name: 'Linh', role: 'Developer', variations: [], active: true },
  { id: uuidv4(), name: 'Hargun', role: 'Developer', variations: [], active: true },
  { id: uuidv4(), name: 'Mohamed Fouda', role: 'Developer', variations: ['Mo', 'MF'], active: true }
];

// Sample tasks for different team members
async function createSampleTasks(memberIds) {
  const tasks = [
    {
      id: uuidv4(),
      title: 'Implement PostgreSQL Integration',
      description: 'Convert the existing file-based storage to use PostgreSQL database',
      status: 'done',
      priority: 'high',
      assignedTo: memberIds[11], // Mohamed
      dueDate: new Date(2025, 0, 31),
      tags: ['database', 'backend']
    },
    {
      id: uuidv4(),
      title: 'Update Frontend Components',
      description: 'Refactor React components to work with the new database structure',
      status: 'in_progress',
      priority: 'high',
      assignedTo: memberIds[0], // Grayson
      dueDate: new Date(2025, 1, 7),
      tags: ['frontend', 'react']
    },
    {
      id: uuidv4(),
      title: 'Design System Updates',
      description: 'Update the design system to match new requirements',
      status: 'todo',
      priority: 'medium',
      assignedTo: memberIds[8], // Connie
      dueDate: new Date(2025, 1, 14),
      tags: ['design', 'ui']
    },
    {
      id: uuidv4(),
      title: 'API Documentation',
      description: 'Document all API endpoints and database schema',
      status: 'todo',
      priority: 'medium',
      assignedTo: memberIds[2], // Salman
      dueDate: new Date(2025, 1, 5),
      tags: ['documentation', 'api']
    },
    {
      id: uuidv4(),
      title: 'Performance Optimization',
      description: 'Optimize database queries and frontend rendering',
      status: 'todo',
      priority: 'high',
      assignedTo: memberIds[1], // Zac
      dueDate: new Date(2025, 1, 10),
      tags: ['optimization', 'performance']
    }
  ];

  return tasks;
}

async function seed() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection successful');

    // Insert team members
    console.log('Inserting team members...');
    await sequelize.query('TRUNCATE TABLE "Tasks" CASCADE');
    await sequelize.query('TRUNCATE TABLE "TeamMembers" CASCADE');
    
    for (const member of teamMembers) {
      await sequelize.query(
        'INSERT INTO "TeamMembers" (id, name, role, variations, active, "createdAt", "updatedAt") VALUES (:id, :name, :role, :variations, :active, NOW(), NOW())',
        {
          replacements: {
            ...member,
            variations: `{${member.variations.join(',')}}`
          }
        }
      );
    }
    console.log('Team members inserted');

    // Create sample tasks
    console.log('Creating sample tasks...');
    const tasks = await createSampleTasks(teamMembers.map(m => m.id));
    
    for (const task of tasks) {
      await sequelize.query(
        'INSERT INTO "Tasks" (id, title, description, status, priority, "assignedTo", "dueDate", tags, "createdAt", "updatedAt") VALUES (:id, :title, :description, :status, :priority, :assignedTo, :dueDate, :tags, NOW(), NOW())',
        {
          replacements: {
            ...task,
            tags: `{${task.tags.join(',')}}`
          }
        }
      );
    }
    console.log('Sample tasks created');

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await sequelize.close();
  }
}

seed();
