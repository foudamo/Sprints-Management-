const { v4: uuidv4 } = require('uuid');
const { sequelize, initModels, testConnection } = require('./db');

async function testDatabase() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Initialize models
    const { TeamMember, Task, ParsedText } = initModels();

    console.log('\nTesting TeamMembers:');
    const members = await TeamMember.findAll();
    console.log(`Found ${members.length} team members:`);
    members.forEach(member => {
      console.log(`- ${member.name} (${member.role}): ${member.nicknames?.join(', ') || 'no nicknames'}`);
    });

    console.log('\nTesting Tasks:');
    const tasks = await Task.findAll({
      include: [{
        model: TeamMember,
        as: 'assignee'
      }]
    });
    console.log(`Found ${tasks.length} tasks:`);
    tasks.forEach(task => {
      console.log(`- ${task.title} (${task.status}) assigned to: ${task.assignee?.name || 'Unassigned'}`);
    });

    console.log('\nTesting ParsedTexts:');
    const parsedTexts = await ParsedText.findAll();
    console.log(`Found ${parsedTexts.length} parsed texts:`);
    parsedTexts.forEach(text => {
      console.log(`- ${text.rawText?.substring(0, 50)}...`);
    });

    // Test creating a new member
    console.log('\nTesting member creation:');
    const testMember = await TeamMember.create({
      id: uuidv4(),
      name: 'Test User',
      role: 'Tester',
      nicknames: ['test', 'tester']
    });
    console.log('Created test member:', testMember.toJSON());

    // Clean up test data
    await testMember.destroy();
    console.log('Cleaned up test member');

  } catch (error) {
    console.error('Database test failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the test
testDatabase()
  .then(() => {
    console.log('\nDatabase tests completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nDatabase tests failed:', error);
    process.exit(1);
  });
