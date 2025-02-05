const { sequelize, initModels } = require('./db');
const { v4: uuidv4 } = require('uuid');

async function testUIDataFlow() {
  try {
    console.log('Starting UI Data Flow Test...\n');
    
    // Initialize models
    const { TeamMember, Task } = initModels();

    // Test 1: Create a new team member
    console.log('Test 1: Creating new team member...');
    const testMember = await TeamMember.create({
      id: uuidv4(),
      name: 'UI Test Member',
      role: 'UI Tester',
      nicknames: ['ui', 'test']
    });
    console.log('Created member:', testMember.toJSON());

    // Test 2: Verify member was saved correctly
    console.log('\nTest 2: Verifying member in database...');
    const savedMember = await TeamMember.findByPk(testMember.id);
    console.log('Retrieved member:', savedMember.toJSON());
    
    if (savedMember.name !== testMember.name || 
        savedMember.role !== testMember.role || 
        savedMember.nicknames.join(',') !== testMember.nicknames.join(',')) {
      throw new Error('Saved member data does not match input data');
    }

    // Test 3: Create a task assigned to the test member
    console.log('\nTest 3: Creating task for test member...');
    const testTask = await Task.create({
      id: uuidv4(),
      title: 'UI Test Task',
      description: 'Testing UI data flow',
      status: 'todo',
      priority: 'medium',
      assignedTo: testMember.id,
      dueDate: new Date()
    });
    console.log('Created task:', testTask.toJSON());

    // Test 4: Verify task was saved with correct association
    console.log('\nTest 4: Verifying task in database...');
    const savedTask = await Task.findByPk(testTask.id, {
      include: [{
        model: TeamMember,
        as: 'assignee'
      }]
    });
    console.log('Retrieved task with assignee:', savedTask.toJSON());

    if (savedTask.assignedTo !== testMember.id) {
      throw new Error('Task association with member failed');
    }

    // Test 5: Update member
    console.log('\nTest 5: Updating test member...');
    const updateResult = await TeamMember.update({
      role: 'Senior UI Tester',
      nicknames: ['ui', 'test', 'senior']
    }, {
      where: { id: testMember.id }
    });
    const updatedMember = await TeamMember.findByPk(testMember.id);
    console.log('Updated member:', updatedMember.toJSON());

    // Test 6: List all members to verify order and format
    console.log('\nTest 6: Listing all members...');
    const allMembers = await TeamMember.findAll({
      order: [['createdAt', 'DESC']]
    });
    console.log(`Total members: ${allMembers.length}`);
    allMembers.forEach(member => {
      console.log(`- ${member.name} (${member.role}): ${member.nicknames.join(', ')}`);
    });

    // Test 7: List all tasks to verify order and format
    console.log('\nTest 7: Listing all tasks...');
    const allTasks = await Task.findAll({
      include: [{
        model: TeamMember,
        as: 'assignee'
      }],
      order: [['createdAt', 'DESC']]
    });
    console.log(`Total tasks: ${allTasks.length}`);
    allTasks.forEach(task => {
      console.log(`- ${task.title} (${task.status}) assigned to: ${task.assignee?.name || 'Unassigned'}`);
    });

    // Clean up test data
    console.log('\nCleaning up test data...');
    await Task.destroy({ where: { id: testTask.id } });
    await TeamMember.destroy({ where: { id: testMember.id } });
    console.log('Test data cleaned up');

    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test
testUIDataFlow()
  .then(success => {
    if (success) {
      console.log('\nAll UI data flow tests passed successfully!');
    } else {
      console.log('\nSome tests failed. Check the error logs above.');
    }
    sequelize.close();
    process.exit(success ? 0 : 1);
  });
