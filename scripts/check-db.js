const { sequelize, TeamMember, Task } = require('../db');
const debug = require('debug')('app:db-check');
const debugError = require('debug')('app:db-check:error');

async function checkDatabase() {
  try {
    debug('Starting database checks...');
    const start = Date.now();

    // Test connection
    await sequelize.authenticate();
    debug('Database connection successful in', Date.now() - start, 'ms');

    // Check tables
    const tables = await sequelize.getQueryInterface().showAllTables();
    debug('Tables found:', tables.length);
    debug('Table names:', tables);

    // Check table schemas
    for (const table of tables) {
      const describe = await sequelize.getQueryInterface().describeTable(table);
      debug(`Schema for ${table}:`, describe);
    }

    // Check indexes
    for (const table of tables) {
      const indexes = await sequelize.getQueryInterface().showIndex(table);
      debug(`Indexes for ${table}:`, indexes);
    }

    // Check constraints
    for (const table of tables) {
      const constraints = await sequelize.query(
        `SELECT constraint_name, constraint_type 
         FROM information_schema.table_constraints 
         WHERE table_name = '${table}'`
      );
      debug(`Constraints for ${table}:`, constraints);
    }

    // Check TeamMembers
    const teamMembers = await TeamMember.findAll();
    console.log('\nTeam Members:', teamMembers.length);
    teamMembers.forEach(member => {
      console.log(`- ${member.name} (${member.id})`);
    });

    // Check Tasks
    const tasks = await Task.findAll({
      include: [{
        model: TeamMember,
        as: 'assignee'
      }]
    });
    console.log('\nTasks:', tasks.length);
    tasks.forEach(task => {
      console.log(`- ${task.title} (${task.status}) - Assigned to: ${task.assignee?.name || 'Unassigned'}`);
    });

    // Check indexes on Tasks table
    const tasksIndexes = await sequelize.getQueryInterface().showIndex('Tasks');
    console.log('\nIndexes on Tasks table:', tasksIndexes.map(idx => idx.name));

    process.exit(0);
  } catch (error) {
    debugError('Database check failed:', error);
    debugError('Stack trace:', error.stack);
    debugError('Connection config:', sequelize.config);
    process.exit(1);
  }
}

checkDatabase();
