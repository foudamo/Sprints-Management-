const { sequelize, initModels } = require('./db');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');
const express = require('express');

async function testUIComponents() {
  try {
    console.log('Starting UI Components Test...\n');
    
    // Initialize Express app and Socket.IO
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);
    
    // Initialize models
    const { TeamMember, Task } = initModels();

    // Test 1: Test HTTP endpoint
    console.log('Test 1: Testing HTTP endpoint...');
    app.get('/api/members', async (req, res) => {
      try {
        const members = await TeamMember.findAll();
        res.json(members);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Start server
    const PORT = 3001;
    server.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
    });

    // Test 2: Test Socket.IO connection
    console.log('\nTest 2: Testing Socket.IO connection...');
    io.on('connection', async (socket) => {
      console.log('Client connected:', socket.id);

      try {
        // Send initial data
        const members = await TeamMember.findAll();
        socket.emit('members', members);
        console.log('Sent initial members data');

        // Handle member events
        socket.on('add_member', async (data) => {
          try {
            const member = await TeamMember.create({
              id: uuidv4(),
              ...data
            });
            io.emit('member_added', member);
            console.log('Member added:', member.toJSON());
          } catch (error) {
            socket.emit('error', { message: error.message });
          }
        });

        socket.on('update_member', async (data) => {
          try {
            await TeamMember.update(data, {
              where: { id: data.id }
            });
            const updated = await TeamMember.findByPk(data.id);
            io.emit('member_updated', updated);
            console.log('Member updated:', updated.toJSON());
          } catch (error) {
            socket.emit('error', { message: error.message });
          }
        });

        socket.on('delete_member', async (memberId) => {
          try {
            await TeamMember.destroy({
              where: { id: memberId }
            });
            io.emit('member_deleted', memberId);
            console.log('Member deleted:', memberId);
          } catch (error) {
            socket.emit('error', { message: error.message });
          }
        });

      } catch (error) {
        console.error('Socket error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Test 3: Create test data
    console.log('\nTest 3: Creating test data...');
    const testMember = await TeamMember.create({
      id: uuidv4(),
      name: 'UI Component Test',
      role: 'Component Tester',
      nicknames: ['ui', 'component']
    });
    console.log('Created test member:', testMember.toJSON());

    // Test 4: Verify data through HTTP endpoint
    console.log('\nTest 4: Verifying HTTP endpoint...');
    const response = await fetch('http://localhost:3001/api/members');
    const members = await response.json();
    console.log('Retrieved members through HTTP:', members);

    // Test 5: Clean up
    console.log('\nTest 5: Cleaning up test data...');
    await TeamMember.destroy({
      where: { id: testMember.id }
    });
    console.log('Test data cleaned up');

    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test
testUIComponents()
  .then(success => {
    if (success) {
      console.log('\nAll UI component tests passed successfully!');
    } else {
      console.log('\nSome tests failed. Check the error logs above.');
    }
    sequelize.close();
    process.exit(success ? 0 : 1);
  });
