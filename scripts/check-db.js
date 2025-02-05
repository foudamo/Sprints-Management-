const { sequelize, TeamMember, Task } = require('../db');

async function checkDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection successful');

    // Check tables
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('\nExisting tables:', tables);

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
    const indexes = await sequelize.getQueryInterface().showIndex('Tasks');
    console.log('\nIndexes on Tasks table:', indexes.map(idx => idx.name));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();
